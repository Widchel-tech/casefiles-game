from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import shutil
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_change_me')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Upload directory
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Create the main app
app = FastAPI(title="CASE FILES - FBI Investigation Game")

# Create routers
api_router = APIRouter(prefix="/api")

# Health check endpoint for Kubernetes
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    try:
        # Verify MongoDB connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@api_router.get("/health")
async def api_health_check():
    """API health check endpoint"""
    return {"status": "ok", "service": "case-files-api"}

# ============== MODELS ==============

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str
    role: str
    career_points: int
    level: int
    level_title: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class SuspectModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    age: int
    role: str
    motive_angle: str
    alibi_summary: str
    risk_notes: str
    is_guilty: bool = False
    portrait_url: Optional[str] = None
    # Enhanced interrogation fields
    personality_type: str = "defensive"  # defensive, cooperative, hostile, calculating
    breaking_point: int = 3  # evidence pieces needed to crack
    lawyer_threshold: int = 2  # pressure level before requesting lawyer
    cooperation_level: int = 50  # 0-100 scale

class ChoiceModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    score_delta: int = 0
    add_clues: List[str] = []
    require_clues: List[str] = []
    next_scene_id: str
    risk_flag: str = "none"  # none, low, medium, high
    # New tracking fields
    conviction_delta: int = 0  # +/- to conviction probability
    evidence_strength_delta: int = 0  # +/- to evidence strength
    procedural_violation: Optional[str] = None  # Type of violation if any
    legal_requirement: Optional[str] = None  # warrant, miranda, consent, etc.

class SceneModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order: int
    title: str
    narration: str
    is_interview_scene: bool = False
    is_accusation_scene: bool = False
    choices: List[ChoiceModel] = []
    media_urls: List[str] = []
    # New CGI scene fields
    scene_type: str = "investigation"  # crime_scene, evidence_lab, interrogation, briefing, tactical, courtroom
    ambient_audio: str = "office"  # office, outdoor, rain, sirens, lab, courtroom
    camera_style: str = "standard"  # standard, dramatic, surveillance, documentary

class ClueModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    description: str
    load_bearing: bool = False
    misdirection: bool = False
    image_url: Optional[str] = None
    # New evidence system fields
    evidence_category: str = "physical"  # physical, digital, financial, behavioral, witness
    evidence_type: str = "generic"  # dna, fingerprint, ballistics, metadata, transaction, statement
    chain_of_custody: bool = True  # Was proper procedure followed?
    legally_obtained: bool = True  # Can be suppressed if false
    evidence_strength: int = 10  # 1-25 contribution to case strength
    requires_warrant: bool = False
    requires_consent: bool = False

class EndingModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # CLOSED, DISMISSED, COMPROMISED, ESCALATED
    title: str
    narration: str
    cp_base: int
    cp_modifiers: Dict[str, int] = {}
    mugshot_url: Optional[str] = None
    # New ending requirements
    min_conviction_probability: int = 0  # Minimum required for this ending
    max_procedural_risk: str = "critical"  # Maximum allowed risk level
    required_evidence_count: int = 0  # Minimum legally obtained evidence pieces
    case_file_photo_url: Optional[str] = None

class CaseCreate(BaseModel):
    case_id: str  # FBI-HOM-24-001
    case_type: str  # HOM, CYB, TRF, FIN, TER, KID, COR
    title: str
    location_county: str
    location_state: str
    victim_overview: str
    victim_photo_url: Optional[str] = None
    summary: str
    difficulty: int = 1
    time_limit_minutes: int = 15
    tags: List[str] = []
    suspects: List[SuspectModel] = []
    scenes: List[SceneModel] = []
    clues: List[ClueModel] = []
    endings: List[EndingModel] = []
    published: bool = False
    patch_notes: List[Dict[str, str]] = []
    bonus_files: List[Dict[str, str]] = []
    # New case fields
    crime_classification: str = "Homicide"  # Full crime type name
    threat_level: str = "moderate"  # low, moderate, high, critical
    jurisdiction_note: str = ""
    case_length: str = "standard"  # short (10-15min), standard (20-30min), major (multi-episode)
    conviction_threshold: int = 70  # Minimum conviction % for CLOSED ending
    max_procedural_violations: int = 3  # Before case is COMPROMISED

class CaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    case_id: str
    case_type: str
    title: str
    location_county: str
    location_state: str
    victim_overview: str
    victim_photo_url: Optional[str] = None
    summary: str
    difficulty: int
    time_limit_minutes: int
    tags: List[str]
    suspects: List[SuspectModel]
    scenes: List[SceneModel]
    clues: List[ClueModel]
    endings: List[EndingModel]
    published: bool
    patch_notes: List[Dict[str, str]]
    bonus_files: List[Dict[str, str]]
    created_at: str
    updated_at: str
    # New fields
    crime_classification: Optional[str] = "Homicide"
    threat_level: Optional[str] = "moderate"
    jurisdiction_note: Optional[str] = ""
    case_length: Optional[str] = "standard"
    conviction_threshold: Optional[int] = 70
    max_procedural_violations: Optional[int] = 3

class PlaySessionStart(BaseModel):
    case_id: str

class MakeChoiceRequest(BaseModel):
    session_id: str
    scene_id: str
    choice_id: str

class AccusationRequest(BaseModel):
    session_id: str
    suspect_id: str
    clue_ids: List[str]

class InterrogationRequest(BaseModel):
    session_id: str
    suspect_id: str
    question: str
    approach: str = "professional"  # professional, aggressive, sympathetic, strategic_silence

class AIGenerateCaseRequest(BaseModel):
    case_type: str
    location_state: str
    location_county: str
    suspects_count: int = 4
    scenes_count: int = 12
    tone: str = "realistic"
    case_length: str = "standard"  # short, standard, major

# Career Rank System
CAREER_RANKS = {
    1: {"title": "ANALYST", "min_cp": 0, "perks": []},
    2: {"title": "FIELD AGENT", "min_cp": 100, "perks": ["faster_warrant"]},
    3: {"title": "SENIOR AGENT", "min_cp": 300, "perks": ["faster_warrant", "advanced_forensics"]},
    4: {"title": "SUPERVISOR", "min_cp": 600, "perks": ["faster_warrant", "advanced_forensics", "federal_resources"]},
    5: {"title": "TASK FORCE LEAD", "min_cp": 1000, "perks": ["faster_warrant", "advanced_forensics", "federal_resources", "multi_jurisdiction"]}
}

# Crime Type Classifications
CRIME_TYPES = {
    "HOM": {"name": "Homicide", "threat_default": "high"},
    "CYB": {"name": "Cybercrime", "threat_default": "moderate"},
    "TRF": {"name": "Trafficking", "threat_default": "critical"},
    "FIN": {"name": "Financial Crimes", "threat_default": "moderate"},
    "TER": {"name": "Domestic Terrorism", "threat_default": "critical"},
    "KID": {"name": "Kidnapping", "threat_default": "critical"},
    "COR": {"name": "Corruption", "threat_default": "high"},
    "NAR": {"name": "Narcotics", "threat_default": "high"},
    "ORG": {"name": "Organized Crime", "threat_default": "high"}
}

# Procedural Violations
PROCEDURAL_VIOLATIONS = {
    "illegal_search": {"risk_increase": 25, "description": "Search conducted without warrant or consent"},
    "miranda_failure": {"risk_increase": 30, "description": "Failed to read Miranda rights before custodial interrogation"},
    "evidence_contamination": {"risk_increase": 20, "description": "Evidence chain of custody broken"},
    "unauthorized_force": {"risk_increase": 35, "description": "Excessive or unauthorized force used"},
    "premature_arrest": {"risk_increase": 15, "description": "Arrest made without probable cause"},
    "witness_coercion": {"risk_increase": 25, "description": "Witness statement obtained through coercion"}
}
    difficulty: int = 2

class SubscriptionPackage(BaseModel):
    package_type: str  # monthly, yearly

class CheckoutRequest(BaseModel):
    package_type: str
    origin_url: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_owner_user(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return user

def get_level_info(cp: int) -> tuple:
    if cp >= 350:
        return 5, "TASK FORCE LEAD"
    elif cp >= 220:
        return 4, "PROFILER"
    elif cp >= 120:
        return 3, "SPECIAL AGENT"
    elif cp >= 50:
        return 2, "FIELD AGENT"
    else:
        return 1, "ANALYST"

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = str(uuid.uuid4())
    level, level_title = get_level_info(0)
    user_doc = {
        "id": user_id,
        "username": data.username,
        "email": data.email,
        "password": hash_password(data.password),
        "role": "player",
        "career_points": 0,
        "level": level,
        "level_title": level_title,
        "subscription_status": "inactive",
        "subscription_expires": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, "player")
    user_response = UserResponse(
        id=user_id,
        username=data.username,
        email=data.email,
        role="player",
        career_points=0,
        level=level,
        level_title=level_title,
        created_at=user_doc["created_at"]
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    level, level_title = get_level_info(user.get("career_points", 0))
    user_response = UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        career_points=user.get("career_points", 0),
        level=level,
        level_title=level_title,
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user=Depends(get_current_user)):
    level, level_title = get_level_info(user.get("career_points", 0))
    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        career_points=user.get("career_points", 0),
        level=level,
        level_title=level_title,
        created_at=user["created_at"]
    )

# ============== OWNER AUTH ==============

@api_router.post("/owner/login", response_model=TokenResponse)
async def owner_login(data: UserLogin):
    user = await db.users.find_one({"email": data.email, "role": "owner"}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid owner credentials")
    
    token = create_token(user["id"], "owner")
    level, level_title = get_level_info(user.get("career_points", 0))
    user_response = UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        career_points=user.get("career_points", 0),
        level=level,
        level_title=level_title,
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, token_type="bearer", user=user_response)

# ============== CASE ROUTES (OWNER) ==============

@api_router.post("/owner/cases", response_model=CaseResponse)
async def create_case(data: CaseCreate, user=Depends(get_owner_user)):
    case_doc = {
        "id": str(uuid.uuid4()),
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cases.insert_one(case_doc)
    del case_doc["_id"]
    return CaseResponse(**case_doc)

@api_router.get("/owner/cases", response_model=List[CaseResponse])
async def get_owner_cases(user=Depends(get_owner_user), limit: int = 100, skip: int = 0):
    # Add pagination with reasonable defaults
    max_limit = min(limit, 100)
    cases = await db.cases.find({}, {"_id": 0}).skip(skip).limit(max_limit).to_list(max_limit)
    return [CaseResponse(**c) for c in cases]

@api_router.get("/owner/cases/{case_id}", response_model=CaseResponse)
async def get_owner_case(case_id: str, user=Depends(get_owner_user)):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse(**case)

@api_router.put("/owner/cases/{case_id}", response_model=CaseResponse)
async def update_case(case_id: str, data: CaseCreate, user=Depends(get_owner_user)):
    update_doc = {
        **data.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.cases.update_one({"id": case_id}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    return CaseResponse(**case)

@api_router.delete("/owner/cases/{case_id}")
async def delete_case(case_id: str, user=Depends(get_owner_user)):
    result = await db.cases.delete_one({"id": case_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case deleted"}

@api_router.post("/owner/cases/{case_id}/publish")
async def toggle_publish(case_id: str, publish: bool, user=Depends(get_owner_user)):
    result = await db.cases.update_one(
        {"id": case_id},
        {"$set": {"published": publish, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": f"Case {'published' if publish else 'unpublished'}"}

# ============== CASE VALIDATION ==============

@api_router.get("/owner/cases/{case_id}/validate")
async def validate_case(case_id: str, user=Depends(get_owner_user)):
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    errors = []
    warnings = []
    
    # Check scene count
    if len(case.get("scenes", [])) < 10:
        errors.append(f"Case must have at least 10 scenes (has {len(case.get('scenes', []))})")
    
    # Check each scene
    for scene in case.get("scenes", []):
        # Check choices
        if len(scene.get("choices", [])) < 2 or len(scene.get("choices", [])) > 3:
            errors.append(f"Scene '{scene['title']}' must have 2-3 choices (has {len(scene.get('choices', []))})")
        
        # Check narration length
        word_count = len(scene.get("narration", "").split())
        if word_count < 90 or word_count > 160:
            warnings.append(f"Scene '{scene['title']}' narration should be 90-160 words (has {word_count})")
    
    # Check for interview scene
    has_interview = any(s.get("is_interview_scene") for s in case.get("scenes", []))
    if not has_interview:
        errors.append("Case must have at least one interview scene")
    
    # Check for accusation scene
    has_accusation = any(s.get("is_accusation_scene") for s in case.get("scenes", []))
    if not has_accusation:
        errors.append("Case must have an accusation scene")
    
    # Check endings
    endings = case.get("endings", [])
    has_closed = any(e.get("type") == "CLOSED_GOOD" for e in endings)
    has_compromised = any(e.get("type") == "COMPROMISED_BAD" for e in endings)
    if not has_closed:
        errors.append("Case must have a CLOSED (GOOD) ending")
    if not has_compromised:
        errors.append("Case must have a COMPROMISED (BAD) ending")
    
    # Check clue references
    all_clue_ids = {c["id"] for c in case.get("clues", [])}
    for scene in case.get("scenes", []):
        for choice in scene.get("choices", []):
            for clue in choice.get("add_clues", []):
                if clue not in all_clue_ids:
                    warnings.append(f"Choice in '{scene['title']}' references unknown clue: {clue}")
            for clue in choice.get("require_clues", []):
                if clue not in all_clue_ids:
                    warnings.append(f"Choice in '{scene['title']}' requires unknown clue: {clue}")
    
    # Check suspects
    if len(case.get("suspects", [])) < 2:
        errors.append("Case must have at least 2 suspects")
    
    # Check for guilty suspect
    has_guilty = any(s.get("is_guilty") for s in case.get("suspects", []))
    if not has_guilty:
        warnings.append("No suspect marked as guilty (solution)")
    
    is_valid = len(errors) == 0
    return {
        "is_valid": is_valid,
        "errors": errors,
        "warnings": warnings
    }

# ============== MEDIA UPLOAD ==============

@api_router.post("/owner/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_owner_user)):
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    new_filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / new_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Store media record - use /api/uploads path for ingress compatibility
    media_doc = {
        "id": file_id,
        "original_name": file.filename,
        "stored_name": new_filename,
        "url": f"/api/uploads/{new_filename}",
        "content_type": file.content_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.media.insert_one(media_doc)
    
    return {"id": file_id, "url": f"/api/uploads/{new_filename}"}

@api_router.get("/owner/media")
async def get_media_library(user=Depends(get_owner_user), limit: int = 100, skip: int = 0):
    # Add pagination for media library
    max_limit = min(limit, 200)
    media = await db.media.find(
        {}, 
        {"_id": 0, "id": 1, "original_name": 1, "url": 1, "content_type": 1, "created_at": 1}
    ).sort("created_at", -1).skip(skip).limit(max_limit).to_list(max_limit)
    return media

# ============== AI CASE GENERATION ==============

@api_router.post("/owner/cases/generate")
async def generate_case_ai(data: AIGenerateCaseRequest, user=Depends(get_owner_user)):
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    chat = LlmChat(
        api_key=api_key,
        session_id=str(uuid.uuid4()),
        system_message="""You are an FBI case file generator for a hyper-realistic investigation game. 
Generate complete case files following strict FBI procedure and chain-of-custody realism.
Output must be valid JSON only, no markdown or explanations."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Generate a complete FBI investigation case with:
- Case Type: {data.case_type}
- Location: {data.location_county}, {data.location_state}
- Number of suspects: {data.suspects_count}
- Number of scenes: {data.scenes_count}
- Tone: {data.tone}
- Difficulty: {data.difficulty}/5

Output as JSON with this exact structure:
{{
  "case_id": "FBI-{data.case_type}-24-001",
  "case_type": "{data.case_type}",
  "title": "Case title",
  "location_county": "{data.location_county}",
  "location_state": "{data.location_state}",
  "victim_overview": "Brief victim description",
  "summary": "Internal case summary",
  "difficulty": {data.difficulty},
  "time_limit_minutes": 15,
  "tags": [],
  "suspects": [
    {{
      "id": "uuid",
      "name": "Full Name",
      "age": 35,
      "role": "Relationship to victim",
      "motive_angle": "Potential motive",
      "alibi_summary": "Alibi details",
      "risk_notes": "Investigation notes",
      "is_guilty": false,
      "portrait_url": null
    }}
  ],
  "scenes": [
    {{
      "id": "S0",
      "order": 0,
      "title": "Scene Title",
      "narration": "90-160 word cinematic narration",
      "is_interview_scene": false,
      "is_accusation_scene": false,
      "choices": [
        {{
          "id": "uuid",
          "text": "Choice text",
          "score_delta": 5,
          "add_clues": [],
          "require_clues": [],
          "next_scene_id": "S1",
          "risk_flag": "none"
        }}
      ],
      "media_urls": []
    }}
  ],
  "clues": [
    {{
      "id": "uuid",
      "label": "Clue Label",
      "description": "What the clue reveals",
      "load_bearing": true,
      "misdirection": false
    }}
  ],
  "endings": [
    {{
      "id": "uuid",
      "type": "CLOSED_GOOD",
      "title": "Case Closed",
      "narration": "Ending narration",
      "cp_base": 30,
      "cp_modifiers": {{}}
    }},
    {{
      "id": "uuid", 
      "type": "COMPROMISED_BAD",
      "title": "Case Compromised",
      "narration": "Bad ending narration",
      "cp_base": 5,
      "cp_modifiers": {{}}
    }}
  ]
}}

Include at least one interview scene (is_interview_scene: true) with Q/A format in narration.
Include one accusation scene (is_accusation_scene: true).
Make one suspect is_guilty: true.
Include 8-14 clues, 3+ marked as load_bearing.
Ensure realistic FBI procedure and chain-of-custody logic."""

    try:
        response = await chat.send_message(UserMessage(text=prompt))
        # Parse JSON from response
        import json
        # Clean response
        response_text = response.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        case_data = json.loads(response_text)
        return case_data
    except Exception as e:
        logging.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

# ============== PLAYER CASE ROUTES ==============

@api_router.get("/cases")
async def get_published_cases(user=Depends(get_current_user)):
    # Get all published cases sorted by creation date
    cases = await db.cases.find(
        {"published": True},
        {"_id": 0, "id": 1, "case_id": 1, "title": 1, "case_type": 1, 
         "location_county": 1, "location_state": 1, "difficulty": 1,
         "time_limit_minutes": 1, "tags": 1, "victim_overview": 1, "victim_photo_url": 1,
         "created_at": 1}
    ).sort("created_at", 1).to_list(100)  # Sort by created_at to get first case
    
    # Check user subscription status
    is_subscribed = user.get("subscription_status") == "active"
    
    # Mark first case as free, others as premium
    for i, case in enumerate(cases):
        case["is_free"] = (i == 0)  # First case is free
        case["is_locked"] = not case["is_free"] and not is_subscribed
    
    return {"cases": cases, "is_subscribed": is_subscribed}

@api_router.get("/cases/{case_id}")
async def get_case_for_play(case_id: str, user=Depends(get_current_user)):
    case = await db.cases.find_one({"id": case_id, "published": True}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    # Remove guilty flag from suspects for players
    for suspect in case.get("suspects", []):
        suspect.pop("is_guilty", None)
    return case

# ============== GAMEPLAY ROUTES ==============

@api_router.post("/play/start")
async def start_play_session(data: PlaySessionStart, user=Depends(get_current_user)):
    # Search by both 'id' and 'case_id' fields for compatibility
    case = await db.cases.find_one(
        {"$or": [{"id": data.case_id}, {"case_id": data.case_id}], "published": True}, 
        {"_id": 0}
    )
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Use the actual case id for session tracking
    actual_case_id = case.get("id")
    
    # Check if this is a premium case and user doesn't have subscription
    all_cases = await db.cases.find(
        {"published": True}, 
        {"_id": 0, "id": 1, "created_at": 1}
    ).sort("created_at", 1).to_list(100)
    
    # Find the index of this case (first case is free)
    case_index = next((i for i, c in enumerate(all_cases) if c["id"] == actual_case_id), -1)
    is_free_case = (case_index == 0)
    is_subscribed = user.get("subscription_status") == "active"
    
    if not is_free_case and not is_subscribed:
        raise HTTPException(
            status_code=403, 
            detail="Subscription required to play this case. The first case is free!"
        )
    
    session_id = str(uuid.uuid4())
    first_scene = case["scenes"][0] if case.get("scenes") else None
    
    # Calculate initial evidence strength from case clues
    initial_evidence_strength = 0
    
    # Get user's rank for perks
    user_level = user.get("level", 1)
    user_rank = CAREER_RANKS.get(user_level, CAREER_RANKS[1])
    
    session_doc = {
        "id": session_id,
        "user_id": user["id"],
        "case_id": actual_case_id,
        "current_scene_id": first_scene["id"] if first_scene else None,
        "score": 0,
        "clues_collected": [],
        "procedural_risk": "LOW",
        "risk_points": 0,
        # New tracking fields
        "conviction_probability": 10,  # Start at 10%
        "evidence_strength": initial_evidence_strength,
        "procedural_violations": [],  # List of violation types
        "evidence_legally_obtained": [],  # Clues that were properly collected
        "evidence_suppressed": [],  # Clues that can't be used in court
        "suspect_cooperation": {},  # {suspect_id: cooperation_level}
        "interrogation_pressure": {},  # {suspect_id: pressure_level}
        "warrants_obtained": [],  # List of warrant types obtained
        "miranda_given": [],  # List of suspect_ids who received Miranda
        "xp_earned": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "ended_at": None,
        "ending_type": None,
        "final_score": None,
        "notes": "",
        "user_rank": user_rank["title"],
        "user_perks": user_rank["perks"]
    }
    await db.play_sessions.insert_one(session_doc)
    
    # Remove guilty flag from suspects for response
    case_for_response = case.copy()
    for suspect in case_for_response.get("suspects", []):
        suspect.pop("is_guilty", None)
    
    return {
        "session_id": session_id,
        "case": case_for_response,
        "current_scene": first_scene,
        "score": 0,
        "clues_collected": [],
        "procedural_risk": "LOW",
        "conviction_probability": 10,
        "evidence_strength": 0,
        "xp_earned": 0,
        "user_rank": user_rank["title"],
        "threat_level": case.get("threat_level", "moderate")
    }

@api_router.post("/play/choice")
async def make_choice(data: MakeChoiceRequest, user=Depends(get_current_user)):
    session = await db.play_sessions.find_one({"id": data.session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Session already ended")
    
    case = await db.cases.find_one({"id": session["case_id"]}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Find the scene and choice
    current_scene = next((s for s in case["scenes"] if s["id"] == data.scene_id), None)
    if not current_scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    choice = next((c for c in current_scene["choices"] if c["id"] == data.choice_id), None)
    if not choice:
        raise HTTPException(status_code=404, detail="Choice not found")
    
    # Check required clues
    for req_clue in choice.get("require_clues", []):
        if req_clue not in session.get("clues_collected", []):
            raise HTTPException(status_code=400, detail=f"Missing required clue: {req_clue}")
    
    # Check legal requirements
    legal_req = choice.get("legal_requirement")
    warrants_obtained = session.get("warrants_obtained", [])
    procedural_violations = session.get("procedural_violations", [])
    
    if legal_req == "warrant" and "search_warrant" not in warrants_obtained:
        # Add procedural violation if warrant required but not obtained
        if "illegal_search" not in procedural_violations:
            procedural_violations.append("illegal_search")
    
    # Update session metrics
    new_score = session.get("score", 0) + choice.get("score_delta", 0)
    new_clues = list(set(session.get("clues_collected", []) + choice.get("add_clues", [])))
    
    # Track evidence legally obtained vs suppressed
    evidence_legally_obtained = session.get("evidence_legally_obtained", [])
    evidence_suppressed = session.get("evidence_suppressed", [])
    
    for clue_id in choice.get("add_clues", []):
        clue_data = next((c for c in case.get("clues", []) if c["id"] == clue_id), None)
        if clue_data:
            if clue_data.get("legally_obtained", True) and not choice.get("procedural_violation"):
                if clue_id not in evidence_legally_obtained:
                    evidence_legally_obtained.append(clue_id)
            else:
                if clue_id not in evidence_suppressed:
                    evidence_suppressed.append(clue_id)
    
    # Handle procedural violations from choice
    if choice.get("procedural_violation"):
        violation_type = choice["procedural_violation"]
        if violation_type not in procedural_violations:
            procedural_violations.append(violation_type)
    
    # Calculate procedural risk based on violations
    risk_points = session.get("risk_points", 0)
    risk_map = {"none": 0, "low": 1, "medium": 3, "high": 5}
    risk_points += risk_map.get(choice.get("risk_flag", "none"), 0)
    
    # Add risk from procedural violations
    for violation in procedural_violations:
        if violation in PROCEDURAL_VIOLATIONS:
            risk_points += PROCEDURAL_VIOLATIONS[violation]["risk_increase"] // 10
    
    if risk_points >= 12:
        new_risk = "CRITICAL"
    elif risk_points >= 8:
        new_risk = "HIGH"
    elif risk_points >= 4:
        new_risk = "MEDIUM"
    else:
        new_risk = "LOW"
    
    # Calculate conviction probability
    conviction_prob = session.get("conviction_probability", 10)
    conviction_prob += choice.get("conviction_delta", 0)
    
    # Add conviction probability based on evidence strength
    for clue_id in choice.get("add_clues", []):
        clue_data = next((c for c in case.get("clues", []) if c["id"] == clue_id), None)
        if clue_data and clue_id in evidence_legally_obtained:
            conviction_prob += clue_data.get("evidence_strength", 5)
    
    # Reduce conviction probability for procedural violations
    conviction_prob -= len(procedural_violations) * 5
    conviction_prob = max(0, min(100, conviction_prob))  # Clamp 0-100
    
    # Calculate evidence strength
    evidence_strength = session.get("evidence_strength", 0)
    evidence_strength += choice.get("evidence_strength_delta", 0)
    for clue_id in choice.get("add_clues", []):
        clue_data = next((c for c in case.get("clues", []) if c["id"] == clue_id), None)
        if clue_data:
            evidence_strength += clue_data.get("evidence_strength", 5)
    
    # Calculate XP earned
    xp_earned = session.get("xp_earned", 0)
    xp_earned += choice.get("score_delta", 0) * 2  # XP is 2x score delta
    if not choice.get("procedural_violation"):
        xp_earned += 5  # Bonus for clean procedure
    
    # Log event
    event_doc = {
        "id": str(uuid.uuid4()),
        "session_id": data.session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scene_id": data.scene_id,
        "choice_id": data.choice_id,
        "score_after": new_score,
        "clues_after": new_clues,
        "risk_after": new_risk,
        "conviction_prob": conviction_prob,
        "evidence_strength": evidence_strength
    }
    await db.event_logs.insert_one(event_doc)
    
    # Update session
    await db.play_sessions.update_one(
        {"id": data.session_id},
        {"$set": {
            "current_scene_id": choice["next_scene_id"],
            "score": new_score,
            "clues_collected": new_clues,
            "procedural_risk": new_risk,
            "risk_points": risk_points,
            "conviction_probability": conviction_prob,
            "evidence_strength": evidence_strength,
            "evidence_legally_obtained": evidence_legally_obtained,
            "evidence_suppressed": evidence_suppressed,
            "procedural_violations": procedural_violations,
            "xp_earned": xp_earned
        }}
    )
    
    # Get next scene
    next_scene = next((s for s in case["scenes"] if s["id"] == choice["next_scene_id"]), None)
    
    return {
        "score": new_score,
        "clues_collected": new_clues,
        "procedural_risk": new_risk,
        "next_scene": next_scene,
        "conviction_probability": conviction_prob,
        "evidence_strength": evidence_strength,
        "xp_earned": xp_earned,
        "procedural_violations": procedural_violations,
        "evidence_legally_obtained": evidence_legally_obtained,
        "evidence_suppressed": evidence_suppressed
    }

@api_router.post("/play/accuse")
async def make_accusation(data: AccusationRequest, user=Depends(get_current_user)):
    session = await db.play_sessions.find_one({"id": data.session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    case = await db.cases.find_one({"id": session["case_id"]}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Get session metrics
    conviction_prob = session.get("conviction_probability", 0)
    procedural_risk = session.get("procedural_risk", "LOW")
    procedural_violations = session.get("procedural_violations", [])
    evidence_legally_obtained = session.get("evidence_legally_obtained", [])
    xp_earned = session.get("xp_earned", 0)
    
    # Validate legally obtained evidence count
    legal_evidence_count = len(evidence_legally_obtained)
    min_evidence_required = case.get("required_evidence_count", 3)
    conviction_threshold = case.get("conviction_threshold", 70)
    max_violations = case.get("max_procedural_violations", 3)
    
    # Check if clues are valid and legally obtained
    player_clues = session.get("clues_collected", [])
    valid_clues = [c for c in data.clue_ids if c in player_clues]
    legal_clues = [c for c in valid_clues if c in evidence_legally_obtained]
    
    if len(valid_clues) < 3:
        return {
            "success": False,
            "message": "Insufficient evidence. You need at least 3 clues to support your accusation.",
            "continue_investigation": True
        }
    
    # Find the suspect
    suspect = next((s for s in case["suspects"] if s["id"] == data.suspect_id), None)
    if not suspect:
        raise HTTPException(status_code=404, detail="Suspect not found")
    
    # Determine outcome based on new system
    is_correct = suspect.get("is_guilty", False)
    
    # Determine ending type based on accumulated evidence and procedure
    if len(procedural_violations) > max_violations or procedural_risk == "CRITICAL":
        # COMPROMISED - Too many procedural violations
        ending_type = "COMPROMISED"
        ending = next((e for e in case["endings"] if e["type"] == "COMPROMISED"), None)
        base_cp = ending.get("cp_base", 5) if ending else 5
        outcome_message = "Case compromised due to procedural violations. Evidence may be suppressed."
        
    elif legal_evidence_count < min_evidence_required:
        # DISMISSED - Not enough legally obtained evidence
        ending_type = "DISMISSED"
        ending = next((e for e in case["endings"] if e["type"] == "DISMISSED"), None)
        base_cp = ending.get("cp_base", 10) if ending else 10
        outcome_message = "Case dismissed due to insufficient admissible evidence."
        
    elif conviction_prob < conviction_threshold:
        # DISMISSED - Conviction probability too low
        ending_type = "DISMISSED"
        ending = next((e for e in case["endings"] if e["type"] == "DISMISSED"), None)
        base_cp = ending.get("cp_base", 10) if ending else 10
        outcome_message = f"Case dismissed. Conviction probability ({conviction_prob}%) below threshold ({conviction_threshold}%)."
        
    elif is_correct and conviction_prob >= conviction_threshold:
        # Check if case should escalate
        threat_level = case.get("threat_level", "moderate")
        if threat_level in ["critical", "high"] and conviction_prob >= 85:
            # ESCALATED - High-profile successful case
            ending_type = "ESCALATED"
            ending = next((e for e in case["endings"] if e["type"] == "ESCALATED"), None)
            base_cp = ending.get("cp_base", 50) if ending else 50
            outcome_message = "Case escalated to Federal Task Force level. Outstanding work, Agent."
        else:
            # CLOSED - Standard successful case
            ending_type = "CLOSED"
            ending = next((e for e in case["endings"] if e["type"] == "CLOSED"), None)
            base_cp = ending.get("cp_base", 35) if ending else 35
            outcome_message = "Case closed. Suspect in custody with prosecution-ready evidence."
    else:
        # Wrong suspect
        ending_type = "DISMISSED"
        ending = next((e for e in case["endings"] if e["type"] == "DISMISSED"), None)
        base_cp = ending.get("cp_base", 5) if ending else 5
        outcome_message = "Wrong suspect accused. Investigation failed."
    
    # Calculate final CP with modifiers
    if is_correct:
        base_cp += min(len(legal_clues) * 3, 15)  # Bonus for legally obtained evidence
    if procedural_risk == "LOW":
        base_cp += 10  # Bonus for clean procedure
    elif procedural_risk == "HIGH":
        base_cp -= 10  # Penalty for high risk
    
    # Add XP earned during investigation
    total_xp = xp_earned + base_cp
    
    final_score = session.get("score", 0) + base_cp
    
    # Update session
    await db.play_sessions.update_one(
        {"id": data.session_id},
        {"$set": {
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "ending_type": ending_type,
            "final_score": final_score,
            "accused_suspect_id": data.suspect_id,
            "accusation_clues": data.clue_ids,
            "conviction_probability_final": conviction_prob,
            "total_xp_earned": total_xp
        }}
    )
    
    # Update user CP and check for rank up
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"career_points": total_xp}}
    )
    
    # Get updated level using new rank system
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    new_cp = updated_user.get("career_points", 0)
    
    # Determine new rank
    new_level = 1
    new_title = "ANALYST"
    for level, rank_info in sorted(CAREER_RANKS.items(), reverse=True):
        if new_cp >= rank_info["min_cp"]:
            new_level = level
            new_title = rank_info["title"]
            break
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"level": new_level, "level_title": new_title}}
    )
    
    ending = next((e for e in case["endings"] if e["type"] == ending_type), None)
    # Fallback to any ending if specific type not found
    if not ending and case.get("endings"):
        ending = case["endings"][0]
    
    return {
        "success": True,
        "correct_accusation": is_correct,
        "ending_type": ending_type,
        "ending_title": ending.get("title", ending_type) if ending else ending_type,
        "ending_narration": ending.get("narration", outcome_message) if ending else outcome_message,
        "career_points_earned": total_xp,
        "final_score": final_score,
        "new_level": new_level,
        "new_title": new_title,
        "conviction_probability": conviction_prob,
        "evidence_strength": session.get("evidence_strength", 0),
        "procedural_violations_count": len(procedural_violations),
        "legal_evidence_count": legal_evidence_count,
        "outcome_message": outcome_message,
        "mugshot_url": ending.get("mugshot_url") if ending else None
    }

# ============== AI INTERROGATION ==============

@api_router.post("/play/interrogate")
async def interrogate_suspect(data: InterrogationRequest, user=Depends(get_current_user)):
    session = await db.play_sessions.find_one({"id": data.session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    case = await db.cases.find_one({"id": session["case_id"]}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    suspect = next((s for s in case["suspects"] if s["id"] == data.suspect_id), None)
    if not suspect:
        raise HTTPException(status_code=404, detail="Suspect not found")
    
    # Get interrogation state
    suspect_cooperation = session.get("suspect_cooperation", {})
    interrogation_pressure = session.get("interrogation_pressure", {})
    miranda_given = session.get("miranda_given", [])
    evidence_collected = session.get("clues_collected", [])
    
    # Get suspect-specific state
    current_cooperation = suspect_cooperation.get(data.suspect_id, suspect.get("cooperation_level", 50))
    current_pressure = interrogation_pressure.get(data.suspect_id, 0)
    
    # Calculate pressure change based on approach
    approach_effects = {
        "professional": {"pressure": 1, "cooperation": 0},
        "aggressive": {"pressure": 3, "cooperation": -10},
        "sympathetic": {"pressure": 0, "cooperation": 5},
        "strategic_silence": {"pressure": 2, "cooperation": -5}
    }
    
    effect = approach_effects.get(data.approach, approach_effects["professional"])
    new_pressure = current_pressure + effect["pressure"]
    new_cooperation = max(0, min(100, current_cooperation + effect["cooperation"]))
    
    # Check if Miranda was given (for custodial interrogation)
    procedural_violations = session.get("procedural_violations", [])
    if data.suspect_id not in miranda_given and new_pressure >= 2:
        if "miranda_failure" not in procedural_violations:
            procedural_violations.append("miranda_failure")
    
    # Check if suspect requests lawyer
    lawyer_requested = new_pressure >= suspect.get("lawyer_threshold", 3)
    
    # Check if suspect breaks (reveals more info)
    suspect_breaks = (
        len(evidence_collected) >= suspect.get("breaking_point", 3) and 
        new_pressure >= 2 and 
        new_cooperation < 30
    )
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Build dynamic interrogation context
    evidence_context = ""
    if evidence_collected:
        case_clues = case.get("clues", [])
        collected_clue_labels = [c.get("label", "") for c in case_clues if c.get("id") in evidence_collected]
        if collected_clue_labels:
            evidence_context = f"Evidence the agent has collected: {', '.join(collected_clue_labels[:5])}"
    
    personality_behaviors = {
        "defensive": "deflect questions, give vague answers, cross arms",
        "cooperative": "answer questions but avoid self-incrimination",
        "hostile": "be confrontational, challenge the agent's authority",
        "calculating": "give careful, measured responses, try to mislead"
    }
    
    personality = suspect.get("personality_type", "defensive")
    behavior = personality_behaviors.get(personality, personality_behaviors["defensive"])
    
    system_prompt = f"""You are {suspect['name']}, a {suspect['age']}-year-old {suspect['role']} being interrogated by an FBI agent.

PERSONALITY: {personality.upper()}
BEHAVIOR: {behavior}

YOUR BACKGROUND:
- Role: {suspect['role']}
- Alibi: {suspect['alibi_summary']}
- Motive: {suspect['motive_angle']}
- Are you guilty: {'Yes, but never admit it directly' if suspect.get('is_guilty') else 'No, you are innocent'}

CURRENT STATE:
- Cooperation level: {new_cooperation}/100
- Pressure level: {new_pressure}/5
- Agent's approach: {data.approach}
{evidence_context}

INTERROGATION RULES:
1. {'You feel cornered. Start showing cracks in your story.' if suspect_breaks else 'Maintain your composure.'}
2. {'REQUEST A LAWYER. Say "I want my lawyer present before answering any more questions."' if lawyer_requested else 'Answer questions but protect yourself.'}
3. If guilty: deflect, create doubt, point at others subtly
4. If innocent: be confused, frustrated, cooperative but defensive
5. Show realistic emotional responses (pauses, sighs, nervous habits)
6. Keep responses under 120 words
7. NEVER break character or reveal the game mechanics
8. Use realistic FBI interview language and pacing"""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"{data.session_id}_{data.suspect_id}",
        system_message=system_prompt
    ).with_model("openai", "gpt-5.2")
    
    try:
        response = await chat.send_message(UserMessage(text=f"FBI Agent ({data.approach} tone): {data.question}"))
        
        # Update session with interrogation state
        suspect_cooperation[data.suspect_id] = new_cooperation
        interrogation_pressure[data.suspect_id] = new_pressure
        
        await db.play_sessions.update_one(
            {"id": data.session_id},
            {"$set": {
                "suspect_cooperation": suspect_cooperation,
                "interrogation_pressure": interrogation_pressure,
                "procedural_violations": procedural_violations
            }}
        )
        
        return {
            "suspect_name": suspect["name"],
            "response": response,
            "cooperation_level": new_cooperation,
            "pressure_level": new_pressure,
            "lawyer_requested": lawyer_requested,
            "suspect_breaking": suspect_breaks,
            "approach_used": data.approach
        }
    except Exception as e:
        logging.error(f"Interrogation error: {e}")
        raise HTTPException(status_code=500, detail="Interrogation failed")

@api_router.post("/play/miranda")
async def give_miranda_rights(session_id: str, suspect_id: str, user=Depends(get_current_user)):
    """Give Miranda rights to a suspect before custodial interrogation"""
    session = await db.play_sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    miranda_given = session.get("miranda_given", [])
    if suspect_id not in miranda_given:
        miranda_given.append(suspect_id)
        await db.play_sessions.update_one(
            {"id": session_id},
            {"$set": {"miranda_given": miranda_given}}
        )
    
    return {"message": "Miranda rights administered", "suspect_id": suspect_id}

@api_router.post("/play/warrant")
async def request_warrant(session_id: str, warrant_type: str, user=Depends(get_current_user)):
    """Request a warrant for search, arrest, or surveillance"""
    session = await db.play_sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    valid_warrants = ["search_warrant", "arrest_warrant", "surveillance_warrant", "financial_warrant"]
    if warrant_type not in valid_warrants:
        raise HTTPException(status_code=400, detail="Invalid warrant type")
    
    # Check user rank for faster warrant approval
    user_perks = session.get("user_perks", [])
    
    warrants_obtained = session.get("warrants_obtained", [])
    if warrant_type not in warrants_obtained:
        warrants_obtained.append(warrant_type)
        await db.play_sessions.update_one(
            {"id": session_id},
            {"$set": {"warrants_obtained": warrants_obtained}}
        )
    
    return {
        "message": f"{warrant_type.replace('_', ' ').title()} approved",
        "warrant_type": warrant_type,
        "fast_track": "faster_warrant" in user_perks
    }

@api_router.post("/play/notes")
async def save_notes(session_id: str, notes: str, user=Depends(get_current_user)):
    await db.play_sessions.update_one(
        {"id": session_id, "user_id": user["id"]},
        {"$set": {"notes": notes}}
    )
    return {"message": "Notes saved"}

# ============== ANALYTICS (OWNER) ==============

@api_router.get("/owner/analytics/overview")
async def get_analytics_overview(user=Depends(get_owner_user)):
    # Total players
    total_players = await db.users.count_documents({"role": "player"})
    
    # Active today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    active_today = await db.play_sessions.distinct("user_id", {
        "started_at": {"$gte": today_start.isoformat()}
    })
    
    # Total play sessions
    total_sessions = await db.play_sessions.count_documents({})
    
    # Completion rate
    completed_sessions = await db.play_sessions.count_documents({"ended_at": {"$ne": None}})
    completion_rate = (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
    
    # Ending distribution
    closed_count = await db.play_sessions.count_documents({"ending_type": "CLOSED_GOOD"})
    compromised_count = await db.play_sessions.count_documents({"ending_type": "COMPROMISED_BAD"})
    
    # Top cases by plays
    pipeline = [
        {"$group": {"_id": "$case_id", "plays": {"$sum": 1}}},
        {"$sort": {"plays": -1}},
        {"$limit": 5}
    ]
    top_cases = await db.play_sessions.aggregate(pipeline).to_list(5)
    
    # Subscription stats
    active_subs = await db.users.count_documents({"subscription_status": "active"})
    
    return {
        "total_players": total_players,
        "active_today": len(active_today),
        "total_sessions": total_sessions,
        "completion_rate": round(completion_rate, 1),
        "ending_distribution": {
            "closed": closed_count,
            "compromised": compromised_count
        },
        "top_cases": top_cases,
        "active_subscriptions": active_subs
    }

@api_router.get("/owner/analytics/cases/{case_id}")
async def get_case_analytics(case_id: str, user=Depends(get_owner_user)):
    # Use aggregation pipeline for efficient analytics
    pipeline = [
        {"$match": {"case_id": case_id}},
        {"$group": {
            "_id": None,
            "total_plays": {"$sum": 1},
            "completed": {"$sum": {"$cond": [{"$ne": ["$ended_at", None]}, 1, 0]}},
            "scores": {"$push": "$final_score"},
            "session_ids": {"$push": "$id"}
        }}
    ]
    
    result = await db.play_sessions.aggregate(pipeline).to_list(1)
    
    if not result:
        return {
            "total_plays": 0,
            "completed": 0,
            "completion_rate": 0,
            "avg_score": 0,
            "choice_frequency": {},
            "scene_activity": {}
        }
    
    stats = result[0]
    total_plays = stats.get("total_plays", 0)
    completed = stats.get("completed", 0)
    scores = [s for s in stats.get("scores", []) if s is not None]
    avg_score = sum(scores) / len(scores) if scores else 0
    session_ids = stats.get("session_ids", [])[:1000]  # Limit to 1000 sessions
    
    # Get choice/scene frequency using aggregation (limited)
    event_pipeline = [
        {"$match": {"session_id": {"$in": session_ids}}},
        {"$limit": 10000},  # Limit events to prevent memory issues
        {"$group": {
            "_id": {"choice_id": "$choice_id", "scene_id": "$scene_id"},
            "count": {"$sum": 1}
        }}
    ]
    
    events = await db.event_logs.aggregate(event_pipeline).to_list(1000)
    
    choice_counts = {}
    scene_dropoffs = {}
    for event in events:
        if event["_id"]["choice_id"]:
            choice_counts[event["_id"]["choice_id"]] = event["count"]
        if event["_id"]["scene_id"]:
            scene_id = event["_id"]["scene_id"]
            scene_dropoffs[scene_id] = scene_dropoffs.get(scene_id, 0) + event["count"]
    
    return {
        "total_plays": total_plays,
        "completed": completed,
        "completion_rate": (completed / total_plays * 100) if total_plays > 0 else 0,
        "avg_score": round(avg_score, 1),
        "choice_frequency": choice_counts,
        "scene_activity": scene_dropoffs
    }

@api_router.get("/owner/analytics/leaderboard")
async def get_leaderboard(user=Depends(get_owner_user)):
    players = await db.users.find(
        {"role": "player"},
        {"_id": 0, "id": 1, "username": 1, "career_points": 1, "level": 1, "level_title": 1}
    ).sort("career_points", -1).limit(50).to_list(50)
    return players

@api_router.get("/owner/analytics/export")
async def export_analytics(user=Depends(get_owner_user), limit: int = 1000, skip: int = 0):
    # Add pagination to export with reasonable limits
    max_limit = min(limit, 5000)  # Cap at 5000 records per export
    sessions = await db.play_sessions.find(
        {}, 
        {"_id": 0, "id": 1, "user_id": 1, "case_id": 1, "started_at": 1, 
         "ended_at": 1, "ending_type": 1, "final_score": 1, "procedural_risk": 1}
    ).skip(skip).limit(max_limit).to_list(max_limit)
    
    import csv
    import io
    
    output = io.StringIO()
    if sessions:
        writer = csv.DictWriter(output, fieldnames=sessions[0].keys())
        writer.writeheader()
        writer.writerows(sessions)
    
    # Get total count for pagination info
    total_count = await db.play_sessions.count_documents({})
    
    return {
        "csv_data": output.getvalue(),
        "total_records": total_count,
        "returned_records": len(sessions),
        "skip": skip,
        "limit": max_limit
    }

# ============== LEADERBOARD (PUBLIC) ==============

@api_router.get("/leaderboard")
async def public_leaderboard(user=Depends(get_current_user)):
    players = await db.users.find(
        {"role": "player"},
        {"_id": 0, "id": 1, "username": 1, "career_points": 1, "level": 1, "level_title": 1}
    ).sort("career_points", -1).limit(100).to_list(100)
    return players

# ============== SUBSCRIPTION / STRIPE ==============

SUBSCRIPTION_PACKAGES = {
    "monthly": 10.99,
    "yearly": 100.00
}

@api_router.post("/payments/checkout")
async def create_checkout(data: CheckoutRequest, request: Request, user=Depends(get_current_user)):
    if data.package_type not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package type")
    
    amount = SUBSCRIPTION_PACKAGES[data.package_type]
    api_key = os.environ.get("STRIPE_API_KEY")
    
    # Validate Stripe configuration
    if not api_key:
        raise HTTPException(status_code=503, detail="Payment system is not configured. Please contact support.")
    
    if not api_key.startswith(("sk_live_", "sk_test_")):
        logger.error("Invalid Stripe API key format in payments/checkout")
        raise HTTPException(status_code=503, detail="Payment system is misconfigured. Please contact support.")
    
    host_url = data.origin_url.rstrip("/")
    
    # Import stripe directly for subscription support
    import stripe
    stripe.api_key = api_key
    
    success_url = f"{host_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/subscription"
    
    # Determine billing interval based on package type
    interval = "month" if data.package_type == "monthly" else "year"
    interval_count = 1
    
    try:
        # Create checkout session with recurring subscription
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"CASE FILES - {'Monthly' if data.package_type == 'monthly' else 'Annual'} Subscription",
                        "description": "Unlimited access to all FBI investigation cases"
                    },
                    "unit_amount": int(amount * 100),  # Stripe uses cents
                    "recurring": {
                        "interval": interval,
                        "interval_count": interval_count
                    }
                },
                "quantity": 1
            }],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user["id"],
                "package_type": data.package_type
            },
            subscription_data={
                "metadata": {
                    "user_id": user["id"],
                    "package_type": data.package_type
                }
            }
        )
        
        # Create payment transaction record
        tx_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session.id,
            "user_id": user["id"],
            "amount": amount,
            "currency": "usd",
            "package_type": data.package_type,
            "payment_status": "pending",
            "subscription_id": None,
            "is_recurring": True,
            "billing_interval": interval,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(tx_doc)
        
        return {"url": session.url, "session_id": session.id}
        
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication error in checkout: {e}")
        raise HTTPException(status_code=503, detail="Payment authentication failed. Please contact support.")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=503, detail="Payment service temporarily unavailable. Please try again later.")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user=Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    
    # Validate Stripe configuration
    if not api_key or not api_key.startswith(("sk_live_", "sk_test_")):
        raise HTTPException(status_code=503, detail="Payment system is not properly configured.")
    
    import stripe
    stripe.api_key = api_key
    
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        
        # Update transaction and user subscription if completed
        if session.status == "complete" and session.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if tx and tx.get("payment_status") != "completed":
                # Get subscription ID from the session
                subscription_id = session.subscription
                
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "completed",
                        "subscription_id": subscription_id
                    }}
                )
                
                # Update user subscription - recurring so no fixed expiry
                package_type = tx.get("package_type", "monthly")
                
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "subscription_status": "active",
                        "subscription_type": package_type,
                        "stripe_subscription_id": subscription_id,
                        "subscription_started": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {
            "status": session.status,
            "payment_status": session.payment_status
        }
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication error in payment status: {e}")
        raise HTTPException(status_code=503, detail="Payment verification failed. Please contact support.")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe status error: {e}")
        raise HTTPException(status_code=503, detail="Unable to verify payment status. Please try again later.")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    
    import stripe
    stripe.api_key = api_key
    
    try:
        # Verify webhook signature if secret is set
        if webhook_secret:
            event = stripe.Webhook.construct_event(body, signature, webhook_secret)
        else:
            import json
            event = json.loads(body)
        
        event_type = event.get("type") if isinstance(event, dict) else event.type
        data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
        
        # Handle checkout completion
        if event_type == "checkout.session.completed":
            session_id = data.get("id") if isinstance(data, dict) else data.id
            metadata = data.get("metadata", {}) if isinstance(data, dict) else data.metadata
            subscription_id = data.get("subscription") if isinstance(data, dict) else data.subscription
            
            user_id = metadata.get("user_id")
            package_type = metadata.get("package_type", "monthly")
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "completed",
                    "subscription_id": subscription_id
                }}
            )
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "subscription_status": "active",
                    "subscription_type": package_type,
                    "stripe_subscription_id": subscription_id,
                    "subscription_started": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Handle subscription renewal (invoice paid)
        elif event_type == "invoice.paid":
            subscription_id = data.get("subscription") if isinstance(data, dict) else data.subscription
            if subscription_id:
                # Find user by subscription ID and extend access
                await db.users.update_one(
                    {"stripe_subscription_id": subscription_id},
                    {"$set": {
                        "subscription_status": "active",
                        "last_payment_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"Subscription renewed: {subscription_id}")
        
        # Handle subscription cancellation
        elif event_type == "customer.subscription.deleted":
            subscription_id = data.get("id") if isinstance(data, dict) else data.id
            await db.users.update_one(
                {"stripe_subscription_id": subscription_id},
                {"$set": {
                    "subscription_status": "cancelled",
                    "subscription_cancelled_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Subscription cancelled: {subscription_id}")
        
        # Handle payment failure
        elif event_type == "invoice.payment_failed":
            subscription_id = data.get("subscription") if isinstance(data, dict) else data.subscription
            if subscription_id:
                await db.users.update_one(
                    {"stripe_subscription_id": subscription_id},
                    {"$set": {
                        "subscription_status": "past_due"
                    }}
                )
                logger.info(f"Payment failed for subscription: {subscription_id}")
        
        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============== OWNER USER MANAGEMENT ==============

@api_router.get("/owner/users")
async def get_users(user=Depends(get_owner_user), limit: int = 100, skip: int = 0):
    # Add pagination for users list - use inclusion projection only
    max_limit = min(limit, 200)
    users = await db.users.find(
        {"role": "player"},
        {"_id": 0}  # Only exclude _id, get all other fields except password
    ).sort("created_at", -1).skip(skip).limit(max_limit).to_list(max_limit)
    # Remove password from results manually
    for u in users:
        u.pop("password", None)
    return users

# ============== REVENUE & STRIPE CONNECT ==============

@api_router.get("/owner/revenue")
async def get_revenue(user=Depends(get_owner_user)):
    # For standard Stripe accounts, we're always "connected" since payments go directly to the account
    stripe_connected = True
    
    # Calculate revenue from transactions
    transactions = await db.payment_transactions.find(
        {"payment_status": "completed"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    total_revenue = sum(tx.get("amount", 0) for tx in transactions)
    
    # This month's revenue
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month = sum(
        tx.get("amount", 0) for tx in transactions 
        if tx.get("created_at") and datetime.fromisoformat(tx["created_at"].replace("Z", "+00:00")) >= month_start
    )
    
    # Pending payout (simplified - in real scenario this would come from Stripe API)
    pending_payout = total_revenue * 0.1  # Example: 10% pending
    
    return {
        "stripe_connected": stripe_connected,
        "total_revenue": total_revenue,
        "this_month": this_month,
        "pending_payout": pending_payout,
        "transactions": transactions[:20]  # Last 20 transactions
    }

@api_router.post("/owner/stripe/connect")
async def connect_stripe_account(request: Request, user=Depends(get_owner_user)):
    """
    Initialize Stripe Connect onboarding for the owner to receive payouts.
    This creates a Stripe Connect account and returns the onboarding URL.
    """
    import stripe
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe integration is not configured. Please contact support.")
    
    # Validate API key format (should start with sk_live_ or sk_test_)
    if not api_key.startswith(("sk_live_", "sk_test_")):
        logger.error(f"Invalid Stripe API key format")
        raise HTTPException(status_code=503, detail="Stripe integration is misconfigured. Please contact support.")
    
    stripe.api_key = api_key
    
    try:
        # Check if owner already has a Stripe account
        owner = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        
        if owner.get("stripe_account_id"):
            # Account exists, create new onboarding link
            account_link = stripe.AccountLink.create(
                account=owner["stripe_account_id"],
                refresh_url=f"{request.headers.get('origin', '')}/owner/revenue",
                return_url=f"{request.headers.get('origin', '')}/owner/revenue",
                type="account_onboarding",
            )
            return {"url": account_link.url}
        
        # Create new Stripe Connect Express account
        account = stripe.Account.create(
            type="express",
            country="US",
            email=user["email"],
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
            metadata={
                "owner_id": user["id"]
            }
        )
        
        # Save account ID to database
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"stripe_account_id": account.id}}
        )
        
        # Create onboarding link
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f"{request.headers.get('origin', '')}/owner/revenue",
            return_url=f"{request.headers.get('origin', '')}/owner/revenue",
            type="account_onboarding",
        )
        
        return {"url": account_link.url}
        
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication error: {e}")
        raise HTTPException(status_code=503, detail="Stripe authentication failed. Please verify the API key configuration.")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe Connect error: {e}")
        raise HTTPException(status_code=503, detail="Stripe service temporarily unavailable. Please try again later.")

@api_router.get("/owner/stripe/dashboard")
async def get_stripe_dashboard_link(user=Depends(get_owner_user)):
    """
    Get a link to the Stripe Express dashboard for the owner to manage payouts.
    """
    import stripe
    
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Stripe integration is not configured. Please contact support.")
    
    # Validate API key format
    if not api_key.startswith(("sk_live_", "sk_test_")):
        logger.error(f"Invalid Stripe API key format")
        raise HTTPException(status_code=503, detail="Stripe integration is misconfigured. Please contact support.")
    
    stripe.api_key = api_key
    
    owner = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    if not owner.get("stripe_account_id"):
        raise HTTPException(status_code=400, detail="Stripe account not connected")
    
    try:
        login_link = stripe.Account.create_login_link(owner["stripe_account_id"])
        return {"url": login_link.url}
    except stripe.error.AuthenticationError as e:
        logger.error(f"Stripe authentication error: {e}")
        raise HTTPException(status_code=503, detail="Stripe authentication failed. Please verify the API key configuration.")
    except stripe.error.StripeError as e:
        logger.error(f"Stripe dashboard error: {e}")
        raise HTTPException(status_code=503, detail="Stripe service temporarily unavailable. Please try again later.")

# ============== INIT OWNER ==============

@api_router.post("/init/owner")
async def init_owner():
    existing = await db.users.find_one({"role": "owner"})
    if existing:
        return {"message": "Owner already exists"}
    
    user_id = str(uuid.uuid4())
    owner_doc = {
        "id": user_id,
        "username": "Widchel",
        "email": "Widchel.ant08@casefiles.fbi",
        "password": hash_password("WidAnt1234!"),
        "role": "owner",
        "career_points": 0,
        "level": 1,
        "level_title": "ADMINISTRATOR",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(owner_doc)
    return {"message": "Owner created"}

# ============== SETUP ==============

# Mount uploads directory at both paths for compatibility
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="api_uploads")

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize owner admin user on startup if not exists"""
    try:
        existing = await db.users.find_one({"role": "owner"})
        if not existing:
            user_id = str(uuid.uuid4())
            owner_doc = {
                "id": user_id,
                "username": "Widchel",
                "email": "Widchel.ant08@casefiles.fbi",
                "password": hash_password("WidAnt1234!"),
                "role": "owner",
                "career_points": 0,
                "level": 1,
                "level_title": "ADMINISTRATOR",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(owner_doc)
            logger.info("Owner admin user created")
        else:
            logger.info("Owner admin user already exists")
    except Exception as e:
        logger.error(f"Error initializing owner: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
