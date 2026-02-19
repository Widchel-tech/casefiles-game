import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class FBICaseFilesAPITester:
    def __init__(self, base_url: str = "https://investigation-engine-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.owner_token: Optional[str] = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None, 
                 use_owner_token: bool = False) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        # Default headers
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
            
        # Add authentication if available
        if use_owner_token and self.owner_token:
            request_headers['Authorization'] = f'Bearer {self.owner_token}'
        elif self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")

            # Check status code
            success = response.status_code == expected_status
            
            # Try to parse JSON response
            try:
                response_data = response.json() if response.text else {}
            except json.JSONDecodeError:
                response_data = {"raw_response": response.text}

            test_result = {
                "name": name,
                "success": success,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "response_data": response_data,
                "timestamp": datetime.now().isoformat()
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response_data and isinstance(response_data, dict) and len(str(response_data)) < 200:
                    print(f"   Response: {response_data}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response_data}")

            self.test_results.append(test_result)
            return success, response_data

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            test_result = {
                "name": name,
                "success": False,
                "expected_status": expected_status,
                "actual_status": 0,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.test_results.append(test_result)
            return False, {"error": str(e)}

    def test_health_check(self) -> bool:
        """Test API health check"""
        return self.run_test("API Health Check", "GET", "", 404)[0]  # No root endpoint expected

    def test_init_owner(self) -> bool:
        """Initialize owner account"""
        success, response = self.run_test(
            "Initialize Owner", "POST", "init/owner", 200
        )
        return success

    def test_owner_login(self, email: str = "admin@casefiles.fbi", password: str = "admin123") -> bool:
        """Test owner login"""
        success, response = self.run_test(
            "Owner Login", "POST", "owner/login", 200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.owner_token = response['access_token']
            print(f"   🔑 Owner token acquired")
            return True
        return False

    def test_user_registration(self, username: str = None, email: str = None, password: str = "TestPass123!") -> bool:
        """Test user registration"""
        # Generate unique test data
        timestamp = datetime.now().strftime("%H%M%S")
        test_username = username or f"testuser_{timestamp}"
        test_email = email or f"test_{timestamp}@test.com"
        
        success, response = self.run_test(
            "User Registration", "POST", "auth/register", 200,
            data={
                "username": test_username, 
                "email": test_email, 
                "password": password
            }
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 User token acquired for {test_username}")
            return True
        return False

    def test_user_login(self, email: str, password: str) -> bool:
        """Test user login with existing credentials"""
        success, response = self.run_test(
            "User Login", "POST", "auth/login", 200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 User login successful")
            return True
        return False

    def test_get_me(self) -> bool:
        """Test get current user info"""
        if not self.token:
            print("❌ No user token available for /auth/me test")
            return False
            
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_get_cases(self) -> bool:
        """Test get published cases"""
        if not self.token:
            print("❌ No user token available for cases test")
            return False
            
        return self.run_test("Get Published Cases", "GET", "cases", 200)[0]

    def test_owner_analytics(self) -> bool:
        """Test owner analytics"""
        if not self.owner_token:
            print("❌ No owner token available for analytics test")
            return False
            
        return self.run_test(
            "Owner Analytics", "GET", "owner/analytics/overview", 200,
            use_owner_token=True
        )[0]

    def test_owner_cases(self) -> bool:
        """Test owner get cases"""
        if not self.owner_token:
            print("❌ No owner token available for owner cases test")
            return False
            
        return self.run_test(
            "Owner Get Cases", "GET", "owner/cases", 200,
            use_owner_token=True
        )[0]

    def test_leaderboard(self) -> bool:
        """Test leaderboard endpoint"""
        if not self.token:
            print("❌ No user token available for leaderboard test")
            return False
            
        return self.run_test("Leaderboard", "GET", "leaderboard", 200)[0]

    def run_all_tests(self) -> Dict[str, Any]:
        """Run comprehensive API test suite"""
        print("🚀 Starting FBI Case Files API Test Suite")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)

        # Test sequence
        test_sequence = [
            ("API Health/Root Check", self.test_health_check),
            ("Initialize Owner", self.test_init_owner),
            ("Owner Login", self.test_owner_login),
            ("Owner Analytics", self.test_owner_analytics),
            ("Owner Cases", self.test_owner_cases),
            ("User Registration", self.test_user_registration),
            ("Get Current User", self.test_get_me),
            ("Get Published Cases", self.test_get_cases),
            ("Leaderboard", self.test_leaderboard),
        ]

        results = {}
        for test_name, test_func in test_sequence:
            try:
                results[test_name] = test_func()
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                results[test_name] = False

        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Failed tests
        failed_tests = [result["name"] for result in self.test_results if not result["success"]]
        if failed_tests:
            print(f"\n❌ Failed tests: {', '.join(failed_tests)}")

        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": round((self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0, 1),
            "failed_tests": failed_tests,
            "test_results": self.test_results,
            "has_owner_token": bool(self.owner_token),
            "has_user_token": bool(self.token)
        }

def main():
    """Main test runner"""
    tester = FBICaseFilesAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())