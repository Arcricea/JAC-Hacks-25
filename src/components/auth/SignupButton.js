import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";

const SignupButton = () => {
  const { loginWithRedirect } = useAuth0();

  const handleSignUp = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
      appState: {
        returnTo: "/"
      }
    });
  };

  return (
    <button
      className="signup-btn"
      onClick={handleSignUp}
    >
      Sign Up
    </button>
  );
};

export default SignupButton; 