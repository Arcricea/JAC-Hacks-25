import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const LoginButton = () => {
  const { loginWithRedirect } = useAuth0();

  const handleLogin = () => {
    loginWithRedirect({
      appState: {
        returnTo: "/"
      }
    });
  };

  return (
    <button 
      className="login-btn" 
      onClick={handleLogin}
    >
      Log In
    </button>
  );
};

export default LoginButton; 