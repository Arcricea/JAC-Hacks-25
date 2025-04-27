import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const AuthSignupButton = ({ className = "primary-btn", children = "Sign Up", returnTo = "/" }) => {
  const { loginWithRedirect } = useAuth0();

  const handleSignUp = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
      appState: {
        returnTo: returnTo
      }
    });
  };

  return (
    <button
      className={className}
      onClick={handleSignUp}
    >
      {children}
    </button>
  );
};

export default AuthSignupButton; 