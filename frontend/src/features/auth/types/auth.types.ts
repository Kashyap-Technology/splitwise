// User data from login
export interface UserLogin {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  user: UserLogin;
  message?: string;
}

// user data from SignUp
export interface UserSignUp {
  id: string;
  email: string;
}

export interface SignUpResponse {
  user: UserSignUp;
  message?: string;
}
