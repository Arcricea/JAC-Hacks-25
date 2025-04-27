import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../assets/styles/Auth.css';

const SignUp = () => {
  const { loginWithRedirect } = useAuth0();

  useEffect(() => {
    // Redirect to Auth0 signup page when component mounts
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup",
      },
      appState: {
        returnTo: "/"
      }
    });
  }, [loginWithRedirect]);

  // This component won't actually render visibly since it redirects
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Redirecting to signup...</h2>
        <p>Please wait while we redirect you to the signup page.</p>
      </div>
    </div>
  );
};

export default SignUp; 