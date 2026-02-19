"""
Script to add 3 new cases to the CASE FILES database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'casefiles')

# New cases to add
NEW_CASES = [
    {
        "id": str(uuid.uuid4()),
        "case_id": "FBI-KID-24-003",
        "case_type": "KID",
        "title": "The Vanishing Act",
        "location_county": "Miami-Dade",
        "location_state": "Florida",
        "victim_overview": "Sophie Martinez, 8, daughter of real estate mogul Carlos Martinez, vanished from her private school's playground. A ransom demand of $5 million arrived within hours.",
        "summary": "A child has been taken. The clock is ticking. Every decision you make could mean the difference between life and death. Navigate the complex web of suspects while racing against time.",
        "difficulty": 5,
        "time_limit_minutes": 15,
        "tags": ["kidnapping", "ransom", "time-critical"],
        "threat_level": "critical",
        "crime_classification": "Kidnapping",
        "conviction_threshold": 65,
        "max_procedural_violations": 2,
        "published": True,
        "patch_notes": [],
        "bonus_files": [],
        "suspects": [
            {
                "id": str(uuid.uuid4()),
                "name": "Ricardo Vega",
                "age": 35,
                "role": "Former Employee",
                "motive_angle": "Fired by Carlos Martinez last year after embezzlement allegations. Lost everything - home, family, reputation.",
                "alibi_summary": "Claims he was at a job interview across town. The company confirms the interview but timing is tight.",
                "risk_notes": "Desperate and bitter. Has knowledge of the family's routine and security protocols.",
                "is_guilty": True,
                "personality_type": "hostile",
                "breaking_point": 3,
                "lawyer_threshold": 2,
                "cooperation_level": 25
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Isabella Martinez",
                "age": 34,
                "role": "Stepmother",
                "motive_angle": "Prenup gives her nothing in divorce. Sophie's disappearance devastates Carlos, potentially keeping the marriage intact.",
                "alibi_summary": "At a spa appointment. Staff confirms her presence but she stepped out for 'a phone call' for 20 minutes.",
                "risk_notes": "Cold and calculating. Genuinely seems distraught but something feels off.",
                "is_guilty": False,
                "personality_type": "calculating",
                "breaking_point": 4,
                "lawyer_threshold": 1,
                "cooperation_level": 45
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Marcus Webb",
                "age": 42,
                "role": "School Security Guard",
                "motive_angle": "Gambling debts totaling $200,000. Has access to school grounds and knows all blind spots.",
                "alibi_summary": "Was on duty but 'took a bathroom break' during the window of disappearance.",
                "risk_notes": "Nervous and evasive. Quick to blame others.",
                "is_guilty": False,
                "personality_type": "defensive",
                "breaking_point": 2,
                "lawyer_threshold": 3,
                "cooperation_level": 55
            }
        ],
        "scenes": [
            {
                "id": "S0",
                "order": 0,
                "title": "The Empty Playground",
                "narration": "Palm trees sway in the humid Miami breeze as you duck under the yellow crime scene tape. Pinecrest Academy's playground sits eerily empty - swings creaking in the wind.\n\nAgent Torres from the Miami Field Office briefs you: 'Sophie Martinez, age 8, was last seen on these swings at 3:15 PM. Teacher turned away for two minutes. When she looked back - gone.'\n\nHe hands you a phone showing the ransom message: '$5 MILLION. 48 HOURS. NO COPS OR SHE DIES.'\n\nYour phone shows 47 hours, 23 minutes remaining.",
                "is_interview_scene": False,
                "is_accusation_scene": False,
                "scene_type": "crime_scene",
                "ambient_audio": "outdoor",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Review security camera footage immediately",
                        "score_delta": 15,
                        "add_clues": ["clue-201"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 10,
                        "evidence_strength_delta": 15
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Interview the teacher who was supervising",
                        "score_delta": 10,
                        "add_clues": ["clue-202"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 5,
                        "evidence_strength_delta": 10
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Set up an unauthorized wire tap on the Martinez home",
                        "score_delta": 20,
                        "add_clues": ["clue-203"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "high",
                        "conviction_delta": -15,
                        "evidence_strength_delta": 20,
                        "procedural_violation": "illegal_search"
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S1",
                "order": 1,
                "title": "Following the Trail",
                "narration": "The security footage reveals a dark van parked near the school's rear gate - a blind spot the security guard conveniently missed. The van's plates are obscured but your tech team enhances the footage.\n\n'Got it,' Agent Torres announces. 'Van's registered to a rental company. Cash payment, fake ID, but...' He pauses. 'The name used was Robert Vega. Ricardo Vega's brother died ten years ago.'\n\nSimultaneously, your financial team reports that the school security guard, Marcus Webb, made a large cash deposit yesterday. And Isabella Martinez's phone records show a burner phone number she's been calling for weeks.",
                "is_interview_scene": False,
                "is_accusation_scene": False,
                "scene_type": "briefing",
                "ambient_audio": "office",
                "camera_style": "standard",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Bring in Ricardo Vega for questioning - the alias is too coincidental",
                        "score_delta": 20,
                        "add_clues": ["clue-204"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "none",
                        "conviction_delta": 20,
                        "evidence_strength_delta": 15
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Investigate Marcus Webb's suspicious deposit",
                        "score_delta": 10,
                        "add_clues": ["clue-205"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "none",
                        "conviction_delta": 5,
                        "evidence_strength_delta": 10
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Confront Isabella about the burner phone",
                        "score_delta": 15,
                        "add_clues": ["clue-206"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "low",
                        "conviction_delta": 10,
                        "evidence_strength_delta": 10
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S2",
                "order": 2,
                "title": "The Interrogation",
                "narration": "Ricardo Vega sits in the interrogation room, sweat beading on his forehead. He's fidgeting, eyes darting to the door.\n\n'I didn't do anything,' he says before you even ask a question. 'Carlos ruined my life, sure. But I'd never hurt a kid. Never.'\n\nHis alibi checks out for the exact moment of abduction, but there's a two-hour window unaccounted for. When you mention the rental van, his face goes pale.\n\n'I... I need a lawyer.'",
                "is_interview_scene": True,
                "is_accusation_scene": False,
                "scene_type": "interrogation",
                "ambient_audio": "office",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Press harder - a child's life is at stake",
                        "score_delta": 25,
                        "add_clues": ["clue-207"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "medium",
                        "conviction_delta": 25,
                        "evidence_strength_delta": 20
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Get a warrant to search his residence",
                        "score_delta": 20,
                        "add_clues": ["clue-208"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "none",
                        "conviction_delta": 20,
                        "evidence_strength_delta": 25,
                        "legal_requirement": "warrant"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Search his car without waiting for warrant - time is critical",
                        "score_delta": 15,
                        "add_clues": ["clue-209"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "high",
                        "conviction_delta": -20,
                        "evidence_strength_delta": 15,
                        "procedural_violation": "illegal_search"
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S3",
                "order": 3,
                "title": "The Breakthrough",
                "narration": "The search warrant pays off. In Ricardo Vega's apartment, agents find Sophie's school backpack hidden in a closet. More damning - a prepaid phone with messages coordinating the pickup.\n\nBut the best evidence comes from the phone's GPS history: it pinged a warehouse in Hialeah just two hours ago.\n\nYou have enough to make your accusation, but Sophie is still missing. Every minute counts.",
                "is_interview_scene": False,
                "is_accusation_scene": True,
                "scene_type": "briefing",
                "ambient_audio": "sirens",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Make your accusation and coordinate the rescue",
                        "score_delta": 0,
                        "add_clues": [],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "none",
                        "conviction_delta": 0,
                        "evidence_strength_delta": 0
                    }
                ],
                "media_urls": []
            }
        ],
        "clues": [
            {"id": "clue-201", "label": "Security Footage", "description": "Dark van with obscured plates near the school's rear gate - a known blind spot.", "load_bearing": True, "misdirection": False, "evidence_category": "digital", "evidence_type": "photograph", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 15},
            {"id": "clue-202", "label": "Teacher's Account", "description": "Sophie mentioned a 'nice man' who waved at her from outside the fence the day before.", "load_bearing": False, "misdirection": False, "evidence_category": "witness", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 10},
            {"id": "clue-203", "label": "Wiretap Recording (Suppressed)", "description": "Recording of Carlos Martinez discussing the ransom. May be inadmissible.", "load_bearing": False, "misdirection": False, "evidence_category": "digital", "evidence_type": "metadata", "chain_of_custody": False, "legally_obtained": False, "evidence_strength": 15},
            {"id": "clue-204", "label": "Van Registration", "description": "Van rented with fake ID using the name 'Robert Vega' - Ricardo's deceased brother.", "load_bearing": True, "misdirection": False, "evidence_category": "financial", "evidence_type": "document", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 20},
            {"id": "clue-205", "label": "Webb's Cash Deposit", "description": "$10,000 cash deposit day before kidnapping. Claims it's gambling winnings.", "load_bearing": False, "misdirection": True, "evidence_category": "financial", "evidence_type": "transaction", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 5},
            {"id": "clue-206", "label": "Isabella's Burner", "description": "Isabella has been calling a divorce lawyer secretly. Motive seems unrelated.", "load_bearing": False, "misdirection": True, "evidence_category": "digital", "evidence_type": "metadata", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 5},
            {"id": "clue-207", "label": "Vega's Breakdown", "description": "Under pressure, Vega revealed he 'only wanted to scare Carlos' and mentioned a warehouse.", "load_bearing": True, "misdirection": False, "evidence_category": "behavioral", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 20},
            {"id": "clue-208", "label": "Sophie's Backpack", "description": "Found hidden in Vega's apartment closet along with the ransom demands.", "load_bearing": True, "misdirection": False, "evidence_category": "physical", "evidence_type": "dna", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 25},
            {"id": "clue-209", "label": "Car Evidence (Suppressed)", "description": "Sophie's hair ribbon found in Vega's car. Obtained without warrant.", "load_bearing": False, "misdirection": False, "evidence_category": "physical", "evidence_type": "dna", "chain_of_custody": False, "legally_obtained": False, "evidence_strength": 15}
        ],
        "endings": [
            {"id": str(uuid.uuid4()), "type": "CLOSED", "title": "Sophie Found Alive", "narration": "The tactical team breached the Hialeah warehouse at 0347 hours. Sophie Martinez was found unharmed, scared but alive, in a makeshift bedroom on the second floor.\n\nRicardo Vega's plan had been simple: ransom money to start over somewhere far away. He never intended to hurt the child, but the law doesn't distinguish between intentions.\n\nVega received 25 years. Carlos Martinez's testimony about his treatment of employees led to reforms in his company.\n\nSophie is home. That's what matters.", "cp_base": 50, "cp_modifiers": {}, "min_conviction_probability": 65, "max_procedural_risk": "medium"},
            {"id": str(uuid.uuid4()), "type": "DISMISSED", "title": "Case Collapsed", "narration": "The evidence wasn't enough. Defense attorneys tore apart the circumstantial case, and key evidence was suppressed due to procedural issues.\n\nVega walked free. Sophie was eventually found, traumatized, in an abandoned building three days later - released when Vega realized he couldn't escape.\n\nThe kidnapper is free. A child is scarred for life. The system failed.", "cp_base": 5, "cp_modifiers": {}, "min_conviction_probability": 0, "max_procedural_risk": "critical"},
            {"id": str(uuid.uuid4()), "type": "ESCALATED", "title": "Task Force Recognition", "narration": "Your work on the Martinez case was exemplary. Not only did you rescue Sophie within 24 hours, but your investigation uncovered a network of for-hire kidnappers operating across three states.\n\nThe Bureau has created a special task force to pursue these cases, and you've been chosen to lead it. Your quick thinking and adherence to procedure saved a life and will save many more.\n\nExceptional work, Agent.", "cp_base": 60, "cp_modifiers": {}, "min_conviction_probability": 85, "max_procedural_risk": "low"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "case_id": "FBI-FIN-24-004",
        "case_type": "FIN",
        "title": "The Ponzi Prince",
        "location_county": "Manhattan",
        "location_state": "New York",
        "victim_overview": "Thousands of investors have lost their life savings in Meridian Capital, a hedge fund that promised 20% annual returns. Total losses exceed $800 million.",
        "summary": "A sophisticated financial scheme has devastated thousands. The mastermind hides behind layers of corporate entities and offshore accounts. Follow the money to bring down Wall Street's biggest fraud.",
        "difficulty": 4,
        "time_limit_minutes": 25,
        "tags": ["financial", "fraud", "white-collar"],
        "threat_level": "high",
        "crime_classification": "Financial Crimes",
        "conviction_threshold": 75,
        "max_procedural_violations": 3,
        "published": True,
        "patch_notes": [],
        "bonus_files": [],
        "suspects": [
            {
                "id": str(uuid.uuid4()),
                "name": "Jonathan Pierce",
                "age": 52,
                "role": "Fund Manager & CEO",
                "motive_angle": "Lifestyle far exceeds legitimate income. Three estates, yacht, private jet. The math doesn't add up.",
                "alibi_summary": "Currently cooperating with investigators. Has hired a team of lawyers.",
                "risk_notes": "Charming and persuasive. Built his career on trust. Will use every legal trick available.",
                "is_guilty": True,
                "personality_type": "calculating",
                "breaking_point": 5,
                "lawyer_threshold": 1,
                "cooperation_level": 40
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Amanda Pierce",
                "age": 48,
                "role": "CFO & Wife",
                "motive_angle": "Signed off on all financial statements. Either complicit or willfully blind.",
                "alibi_summary": "Claims she trusted her husband and rubber-stamped documents.",
                "risk_notes": "Potentially a victim herself. May flip if offered immunity.",
                "is_guilty": False,
                "personality_type": "cooperative",
                "breaking_point": 2,
                "lawyer_threshold": 2,
                "cooperation_level": 60
            },
            {
                "id": str(uuid.uuid4()),
                "name": "David Reinholt",
                "age": 38,
                "role": "Chief Accountant",
                "motive_angle": "Received $2 million in unexplained bonuses over five years. Managed the books.",
                "alibi_summary": "Claims he was 'just following orders' and didn't understand the full picture.",
                "risk_notes": "Nervous. Has young family. Might cooperate to avoid prison.",
                "is_guilty": False,
                "personality_type": "defensive",
                "breaking_point": 2,
                "lawyer_threshold": 3,
                "cooperation_level": 55
            }
        ],
        "scenes": [
            {
                "id": "S0",
                "order": 0,
                "title": "The Glass Tower",
                "narration": "Meridian Capital's headquarters occupy the top three floors of a Manhattan skyscraper. Floor-to-ceiling windows offer views of Central Park that most New Yorkers will never see.\n\nYour team has been granted access after the SEC's emergency freeze. Forensic accountants are already poring over files, but you know the real story lies in what's been hidden.\n\nJonathan Pierce himself greets you at the elevator. 'Agent, I want to assure you of our full cooperation. This is all a misunderstanding - a few bad trades, some accounting errors. Nothing more.'\n\nHis smile doesn't reach his eyes.",
                "is_interview_scene": False,
                "is_accusation_scene": False,
                "scene_type": "crime_scene",
                "ambient_audio": "office",
                "camera_style": "standard",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Examine the trading records and financial statements",
                        "score_delta": 15,
                        "add_clues": ["clue-301"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 10,
                        "evidence_strength_delta": 15
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Interview David Reinholt separately - accountants know where bodies are buried",
                        "score_delta": 10,
                        "add_clues": ["clue-302"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 8,
                        "evidence_strength_delta": 10
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Seize Pierce's personal computer without warrant - the evidence might disappear",
                        "score_delta": 20,
                        "add_clues": ["clue-303"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "high",
                        "conviction_delta": -20,
                        "evidence_strength_delta": 20,
                        "procedural_violation": "illegal_search"
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S1",
                "order": 1,
                "title": "The Paper Trail",
                "narration": "The forensic accounting team has found something significant. The trading records show a pattern: actual trades were minimal, yet investor statements showed consistent gains.\n\n'Classic Ponzi structure,' your analyst explains. 'New investor money paid returns to old investors. There was never any real investment strategy.'\n\nThe offshore accounts are more interesting. Shell companies in the Caymans, Luxembourg, and Singapore - all leading back to a single trust. A trust with one beneficiary: Jonathan Pierce.\n\nDavid Reinholt has requested to speak with you. He says he 'has information that will change everything.'",
                "is_interview_scene": False,
                "is_accusation_scene": False,
                "scene_type": "evidence_lab",
                "ambient_audio": "office",
                "camera_style": "standard",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Meet with David Reinholt",
                        "score_delta": 20,
                        "add_clues": ["clue-304"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "none",
                        "conviction_delta": 15,
                        "evidence_strength_delta": 20
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Subpoena the offshore bank records",
                        "score_delta": 15,
                        "add_clues": ["clue-305"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "none",
                        "conviction_delta": 20,
                        "evidence_strength_delta": 25,
                        "legal_requirement": "warrant"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Confront Jonathan Pierce directly with the evidence",
                        "score_delta": 10,
                        "add_clues": ["clue-306"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "low",
                        "conviction_delta": 10,
                        "evidence_strength_delta": 10
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S2",
                "order": 2,
                "title": "The Whistleblower",
                "narration": "David Reinholt meets you in a conference room, looking like he hasn't slept in days. His lawyer sits beside him, ready to negotiate.\n\n'I have emails,' David says, pulling out a USB drive. 'Jonathan knew from the beginning. He instructed me to create false trading records. Amanda signed off on everything, but I'm not sure she understood.'\n\nThe emails are damning. Instructions to 'smooth the numbers,' 'create investor confidence,' and most critically: 'the returns don't need to be real, they just need to look real.'\n\n'I want immunity,' David says. 'Full cooperation for immunity.'",
                "is_interview_scene": True,
                "is_accusation_scene": False,
                "scene_type": "interrogation",
                "ambient_audio": "office",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Recommend immunity deal - his testimony is crucial",
                        "score_delta": 25,
                        "add_clues": ["clue-307"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "none",
                        "conviction_delta": 25,
                        "evidence_strength_delta": 25
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Take the evidence without promising immunity",
                        "score_delta": 15,
                        "add_clues": ["clue-308"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "low",
                        "conviction_delta": 15,
                        "evidence_strength_delta": 15
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S3",
                "order": 3,
                "title": "The Reckoning",
                "narration": "The case is ready. You have:\n\n- Trading records proving no legitimate investment activity\n- Offshore accounts showing $200 million in stolen funds\n- A cooperating witness with incriminating emails\n- Bank records tracing money to Pierce's personal trust\n\nJonathan Pierce sits in the interview room, his $3,000 suit a stark contrast to the institutional gray walls. His lawyers flank him like guard dogs.\n\n'Agent, my client maintains his innocence. This was a legitimate business that suffered unfortunate losses. Unless you're prepared to make an arrest, we'll be leaving.'\n\nIt's time to make your move.",
                "is_interview_scene": False,
                "is_accusation_scene": True,
                "scene_type": "courtroom",
                "ambient_audio": "office",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Make your accusation",
                        "score_delta": 0,
                        "add_clues": [],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "none",
                        "conviction_delta": 0,
                        "evidence_strength_delta": 0
                    }
                ],
                "media_urls": []
            }
        ],
        "clues": [
            {"id": "clue-301", "label": "Trading Records", "description": "Actual trades were minimal. Returns were fabricated through accounting manipulation.", "load_bearing": True, "misdirection": False, "evidence_category": "financial", "evidence_type": "document", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 20},
            {"id": "clue-302", "label": "Reinholt's Concerns", "description": "Accountant admits he was instructed to 'make the numbers work.'", "load_bearing": False, "misdirection": False, "evidence_category": "witness", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 10},
            {"id": "clue-303", "label": "Pierce's Computer (Suppressed)", "description": "Contains deleted files showing fund transfers. Seized improperly.", "load_bearing": False, "misdirection": False, "evidence_category": "digital", "evidence_type": "document", "chain_of_custody": False, "legally_obtained": False, "evidence_strength": 20},
            {"id": "clue-304", "label": "Incriminating Emails", "description": "Jonathan Pierce explicitly instructed creation of false trading records.", "load_bearing": True, "misdirection": False, "evidence_category": "digital", "evidence_type": "document", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 25},
            {"id": "clue-305", "label": "Offshore Records", "description": "$200 million traced through shell companies to Pierce's personal trust.", "load_bearing": True, "misdirection": False, "evidence_category": "financial", "evidence_type": "transaction", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 25},
            {"id": "clue-306", "label": "Pierce's Denial", "description": "When confronted, Pierce blamed 'rogue employees' and 'market conditions.'", "load_bearing": False, "misdirection": False, "evidence_category": "behavioral", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 5},
            {"id": "clue-307", "label": "Cooperating Witness", "description": "David Reinholt has agreed to testify against Pierce in exchange for immunity.", "load_bearing": True, "misdirection": False, "evidence_category": "witness", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 20},
            {"id": "clue-308", "label": "Documentary Evidence", "description": "USB drive containing emails, without formal cooperation agreement.", "load_bearing": True, "misdirection": False, "evidence_category": "digital", "evidence_type": "document", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 15}
        ],
        "endings": [
            {"id": str(uuid.uuid4()), "type": "CLOSED", "title": "The King Falls", "narration": "Jonathan Pierce's empire crumbled in spectacular fashion. The trial lasted three months, but the outcome was never in doubt. The evidence was overwhelming.\n\nPierce received 150 years - effectively a life sentence. The court ordered forfeiture of all assets, which will be distributed to victims. It won't make them whole, but it's something.\n\nThe Meridian case is now taught in FBI training as a textbook example of financial crime investigation.\n\nJustice, in this case, was served.", "cp_base": 45, "cp_modifiers": {}, "min_conviction_probability": 75, "max_procedural_risk": "medium"},
            {"id": str(uuid.uuid4()), "type": "DISMISSED", "title": "Walking Away", "narration": "Pierce's legal team earned their fees. They challenged every piece of evidence, questioned every witness, and exploited every procedural misstep.\n\nThe jury couldn't reach a verdict. The judge declared a mistrial.\n\nJonathan Pierce walked out of the courthouse a free man, though his reputation was destroyed. He now lives in a country without extradition treaties, still wealthy from hidden accounts.\n\n$800 million stolen. Thousands of lives ruined. And the mastermind walks free.", "cp_base": 5, "cp_modifiers": {}, "min_conviction_probability": 0, "max_procedural_risk": "critical"},
            {"id": str(uuid.uuid4()), "type": "ESCALATED", "title": "The Network Exposed", "narration": "The Pierce investigation was just the beginning. Your meticulous work uncovered a network of financial criminals across Wall Street - a web of fraud touching dozens of funds and billions of dollars.\n\nThe Bureau has established a special Financial Crimes Task Force, and you've been named lead investigator. The skills you demonstrated here will be crucial in cleaning up the darkest corners of American finance.\n\nExceptional work, Agent. This is just the start.", "cp_base": 55, "cp_modifiers": {}, "min_conviction_probability": 85, "max_procedural_risk": "low"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "id": str(uuid.uuid4()),
        "case_id": "FBI-TER-24-005",
        "case_type": "TER",
        "title": "Countdown",
        "location_county": "Hennepin",
        "location_state": "Minnesota",
        "victim_overview": "A credible threat has been received targeting the Minneapolis Convention Center during the National Tech Summit. 15,000 attendees. 48 hours until the event.",
        "summary": "A domestic terror cell is planning an attack. Intelligence suggests multiple operatives and a complex plot. Race against time to identify the threat and prevent catastrophe.",
        "difficulty": 5,
        "time_limit_minutes": 18,
        "tags": ["terrorism", "time-critical", "prevention"],
        "threat_level": "critical",
        "crime_classification": "Domestic Terrorism",
        "conviction_threshold": 60,
        "max_procedural_violations": 2,
        "published": True,
        "patch_notes": [],
        "bonus_files": [],
        "suspects": [
            {
                "id": str(uuid.uuid4()),
                "name": "Thomas Greene",
                "age": 44,
                "role": "Militia Leader",
                "motive_angle": "Leader of 'True Patriots' militia. Anti-government rhetoric has escalated to calls for 'direct action.'",
                "alibi_summary": "Claims to be planning a 'peaceful demonstration' outside the event.",
                "risk_notes": "Charismatic and ideologically committed. Followers are fiercely loyal.",
                "is_guilty": True,
                "personality_type": "hostile",
                "breaking_point": 5,
                "lawyer_threshold": 1,
                "cooperation_level": 15
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Sarah Mitchell",
                "age": 31,
                "role": "Recent Convert",
                "motive_angle": "Former tech worker laid off during automation wave. Joined militia six months ago.",
                "alibi_summary": "Has access to the convention center as a former contractor. Security badge may still be active.",
                "risk_notes": "Recent radicalization. May still have doubts. Potential to flip.",
                "is_guilty": False,
                "personality_type": "cooperative",
                "breaking_point": 2,
                "lawyer_threshold": 3,
                "cooperation_level": 50
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Michael Torres",
                "age": 38,
                "role": "Explosives Expert",
                "motive_angle": "Former military demolitions specialist. Discharged under unclear circumstances.",
                "alibi_summary": "Surveillance shows him purchasing large quantities of fertilizer.",
                "risk_notes": "Technical expertise makes him extremely dangerous. Quiet and methodical.",
                "is_guilty": True,
                "personality_type": "calculating",
                "breaking_point": 4,
                "lawyer_threshold": 2,
                "cooperation_level": 25
            }
        ],
        "scenes": [
            {
                "id": "S0",
                "order": 0,
                "title": "The Threat",
                "narration": "The message arrived at 0347 hours: 'The National Tech Summit celebrates everything wrong with America. Technology that steals jobs. Elites who profit from suffering. In 48 hours, we send our message. True Patriots.'\n\nThe Joint Terrorism Task Force has been mobilized. Every available agent is working this case.\n\nSurveillance has identified three persons of interest with connections to the 'True Patriots' militia. Each presents a different threat vector.\n\nThe clock shows 47:12:33 remaining.",
                "is_interview_scene": False,
                "is_accusation_scene": False,
                "scene_type": "briefing",
                "ambient_audio": "office",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Focus on Thomas Greene - the leader is the key",
                        "score_delta": 15,
                        "add_clues": ["clue-401"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 10,
                        "evidence_strength_delta": 10
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Investigate Sarah Mitchell's convention center access",
                        "score_delta": 20,
                        "add_clues": ["clue-402"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 15,
                        "evidence_strength_delta": 15
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Track Michael Torres's fertilizer purchases",
                        "score_delta": 25,
                        "add_clues": ["clue-403"],
                        "require_clues": [],
                        "next_scene_id": "S1",
                        "risk_flag": "none",
                        "conviction_delta": 20,
                        "evidence_strength_delta": 20
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S1",
                "order": 1,
                "title": "The Compound",
                "narration": "Aerial surveillance of the True Patriots compound reveals increased activity. Vehicles coming and going at odd hours. A large shed that wasn't there two months ago.\n\nSarah Mitchell was spotted leaving the compound yesterday. She looked nervous, kept looking over her shoulder.\n\nMeanwhile, your team has tracked Torres's fertilizer to a storage unit on the outskirts of the city. Enough material for a significant explosive device.\n\nThe clock reads 36:45:21.",
                "is_interview_scene": False,
                "is_accusation_scene": False,
                "scene_type": "investigation",
                "ambient_audio": "outdoor",
                "camera_style": "surveillance",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Approach Sarah Mitchell as potential informant",
                        "score_delta": 25,
                        "add_clues": ["clue-404"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "low",
                        "conviction_delta": 20,
                        "evidence_strength_delta": 20
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Get warrant to search the storage unit",
                        "score_delta": 20,
                        "add_clues": ["clue-405"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "none",
                        "conviction_delta": 25,
                        "evidence_strength_delta": 25,
                        "legal_requirement": "warrant"
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Raid the compound immediately - can't risk waiting",
                        "score_delta": 10,
                        "add_clues": ["clue-406"],
                        "require_clues": [],
                        "next_scene_id": "S2",
                        "risk_flag": "high",
                        "conviction_delta": -15,
                        "evidence_strength_delta": 10,
                        "procedural_violation": "premature_arrest"
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S2",
                "order": 2,
                "title": "The Informant",
                "narration": "Sarah Mitchell agreed to meet at a secure location. She's terrified but resolute.\n\n'They're planning something big,' she says. 'I joined because I was angry about losing my job. But this... this isn't protest. This is murder.'\n\nShe provides details: Torres has built a vehicle-borne device. Greene plans to drive it into the convention center's underground parking garage during the keynote speech.\n\n'The attack is planned for tomorrow. 10 AM. When the keynote starts.'\n\nYou have enough for arrests, but you need to find the device.",
                "is_interview_scene": True,
                "is_accusation_scene": False,
                "scene_type": "interrogation",
                "ambient_audio": "office",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Coordinate with SWAT for compound raid while securing the storage unit",
                        "score_delta": 30,
                        "add_clues": ["clue-407"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "none",
                        "conviction_delta": 30,
                        "evidence_strength_delta": 30
                    },
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Arrest Greene immediately to prevent the attack",
                        "score_delta": 20,
                        "add_clues": ["clue-408"],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "low",
                        "conviction_delta": 20,
                        "evidence_strength_delta": 15
                    }
                ],
                "media_urls": []
            },
            {
                "id": "S3",
                "order": 3,
                "title": "The Takedown",
                "narration": "The operation unfolds at dawn. SWAT teams hit the compound and storage unit simultaneously. Thomas Greene is taken into custody without incident - he wasn't expecting the raid.\n\nThe storage unit yields the evidence you need: a van packed with explosives, detailed plans of the convention center, and Torres's fingerprints everywhere.\n\nMichael Torres was arrested at a motel three miles away. The attack has been prevented.\n\nNow it's time to ensure these men never see freedom again.",
                "is_interview_scene": False,
                "is_accusation_scene": True,
                "scene_type": "courtroom",
                "ambient_audio": "office",
                "camera_style": "dramatic",
                "choices": [
                    {
                        "id": str(uuid.uuid4()),
                        "text": "Make your accusation",
                        "score_delta": 0,
                        "add_clues": [],
                        "require_clues": [],
                        "next_scene_id": "S3",
                        "risk_flag": "none",
                        "conviction_delta": 0,
                        "evidence_strength_delta": 0
                    }
                ],
                "media_urls": []
            }
        ],
        "clues": [
            {"id": "clue-401", "label": "Greene's Manifesto", "description": "Online posts calling for 'decisive action against the tech elite.'", "load_bearing": False, "misdirection": False, "evidence_category": "digital", "evidence_type": "document", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 10},
            {"id": "clue-402", "label": "Mitchell's Badge", "description": "Sarah's contractor badge was still active - potential access point identified.", "load_bearing": True, "misdirection": False, "evidence_category": "physical", "evidence_type": "document", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 15},
            {"id": "clue-403", "label": "Fertilizer Trail", "description": "Torres purchased 500 lbs of ammonium nitrate - consistent with explosive manufacturing.", "load_bearing": True, "misdirection": False, "evidence_category": "financial", "evidence_type": "transaction", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 20},
            {"id": "clue-404", "label": "Mitchell's Testimony", "description": "Detailed account of attack plans, timeline, and Greene's leadership role.", "load_bearing": True, "misdirection": False, "evidence_category": "witness", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 25},
            {"id": "clue-405", "label": "Storage Unit Evidence", "description": "Explosive device components, convention center blueprints, Torres's DNA.", "load_bearing": True, "misdirection": False, "evidence_category": "physical", "evidence_type": "dna", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 25},
            {"id": "clue-406", "label": "Premature Raid Evidence (Challenged)", "description": "Evidence from compound raid may be suppressed due to procedural issues.", "load_bearing": False, "misdirection": False, "evidence_category": "physical", "evidence_type": "generic", "chain_of_custody": False, "legally_obtained": False, "evidence_strength": 10},
            {"id": "clue-407", "label": "Complete Evidence Package", "description": "Full documentary and physical evidence from coordinated operation.", "load_bearing": True, "misdirection": False, "evidence_category": "physical", "evidence_type": "dna", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 30},
            {"id": "clue-408", "label": "Greene's Arrest", "description": "Greene in custody, but device location initially unknown.", "load_bearing": True, "misdirection": False, "evidence_category": "behavioral", "evidence_type": "statement", "chain_of_custody": True, "legally_obtained": True, "evidence_strength": 15}
        ],
        "endings": [
            {"id": str(uuid.uuid4()), "type": "CLOSED", "title": "Attack Prevented", "narration": "The National Tech Summit proceeded without incident. 15,000 people went home safely, never knowing how close they came to tragedy.\n\nThomas Greene and Michael Torres were convicted on multiple counts of conspiracy to commit terrorism and weapons of mass destruction charges. They will spend the rest of their lives in federal prison.\n\nSarah Mitchell testified against them and entered witness protection. She saved thousands of lives.\n\nYour vigilance protected the innocent. Well done, Agent.", "cp_base": 55, "cp_modifiers": {}, "min_conviction_probability": 60, "max_procedural_risk": "medium"},
            {"id": str(uuid.uuid4()), "type": "COMPROMISED", "title": "Partial Success", "narration": "The attack was prevented, but procedural violations meant the prosecution's case was weakened. Greene received a reduced sentence on lesser charges and will be eligible for parole in fifteen years.\n\nTorres, the bomb maker, received the full sentence, but Greene's followers see him as a martyr.\n\nThe threat was neutralized, but justice was incomplete.", "cp_base": 20, "cp_modifiers": {}, "min_conviction_probability": 0, "max_procedural_risk": "low"},
            {"id": str(uuid.uuid4()), "type": "ESCALATED", "title": "Counterterrorism Honor", "narration": "Your work on the True Patriots case has been recognized at the highest levels. Not only did you prevent a mass casualty attack, but your investigation exposed a nationwide network of extremist cells.\n\nYou've been awarded the FBI Star and offered a position at the National Counterterrorism Center. Your expertise will help protect the nation for years to come.\n\nExceptional work, Agent. The nation owes you a debt it can never repay.", "cp_base": 65, "cp_modifiers": {}, "min_conviction_probability": 85, "max_procedural_risk": "low"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
]

async def add_cases():
    """Add new cases to the database"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    for case in NEW_CASES:
        # Check if case already exists
        existing = await db.cases.find_one({"case_id": case["case_id"]})
        if existing:
            print(f"Case {case['case_id']} already exists, skipping...")
            continue
        
        result = await db.cases.insert_one(case)
        print(f"Added case: {case['case_id']} - {case['title']}")
    
    # Print total cases count
    total = await db.cases.count_documents({})
    print(f"\nTotal cases in database: {total}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_cases())
