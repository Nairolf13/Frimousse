import { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || "";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const cameFromLogin = !!searchParams.get('sent');
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);
  
  // Countdown for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // No auto-resend needed here: the login endpoint already sends a fresh
  // code when the user attempts to log in with an unverified email, and
  // registration sends one during sign-up.  Auto-resending was causing a
  // duplicate email with a different code.
  
  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');
    
    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-submit when all 6 digits are entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < pasteData.length && i < 6; i++) {
        newCode[i] = pasteData[i];
      }
      setCode(newCode);
      
      // Focus last filled input or next empty one
      const focusIndex = Math.min(pasteData.length, 5);
      inputRefs.current[focusIndex]?.focus();
      
      // Auto-submit if complete
      if (pasteData.length === 6) {
        handleVerify(pasteData);
      }
    }
  };
  
  // grab setter from context; `useAuth` always returns object with setUser
  const { setUser } = useAuth();

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    if (codeToVerify.length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code: codeToVerify })
      });
      
      interface VerifyResp {
        ok?: boolean;
        id?: string;
        email?: string;
        name?: string;
        role?: string;
        centerId?: string | null;
        expired?: boolean;
        error?: string;
        message?: string;
      }

      let data: VerifyResp = {};
      try {
        data = await res.json();
      } catch (parseErr) {
        // ignore parse errors, we'll handle based on status code below
        console.warn('verify-email response not JSON', parseErr);
      }
      
      if (!res.ok) {
        if (data && data.expired) {
          setError('Code expiré. Cliquez sur "Renvoyer le code" pour en recevoir un nouveau.');
        } else {
          setError((data && (data.error || data.message)) || 'Code invalide');
        }
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }
      
      // if backend returned user info, update context
      if (data && data.id) {
        setUser({
          id: data.id,
          email: data.email || null,
          name: data.name || '',
          role: data.role || '',
          centerId: data.centerId || null
        });
      }

      setSuccess(true);
      // immediately redirect to dashboard (user will be logged in via cookies set by server)
      navigate('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResend = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    setError('');
    setResendSuccess(false);
    
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erreur lors de l\'envoi');
        return;
      }
      
      setResendSuccess(true);
      setCountdown(60); // 60 seconds cooldown
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('Resend error:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setResending(false);
    }
  };
  
  if (!email) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2]">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-4">
            <img src="/imgs/FrimousseLogo.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-[#0b5566]">Erreur</h2>
          <p className="text-gray-600 mb-6">Aucune adresse email spécifiée.</p>
          <a href="/register" className="text-[#0b5566] hover:underline">Retour à l'inscription</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-r from-[#f7f4d7] to-[#a9ddf2]">
      <Helmet><meta name="robots" content="noindex,nofollow" /></Helmet>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <div className="w-20 h-20 mb-4">
          <img src="/imgs/FrimousseLogo.webp" alt="Logo Frimousse" className="w-full h-full object-contain" />
        </div>
        
        {success ? (
          <>
            <div className="w-16 h-16 mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-[#0b5566] text-center">Email vérifié !</h2>
            <p className="text-gray-600 text-center mb-4">Votre adresse email a été vérifiée avec succès.</p>
            <p className="text-sm text-gray-500">Redirection vers la connexion...</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2 text-[#0b5566] text-center">Vérifiez votre email</h2>
            <p className="text-gray-600 text-center mb-2">
              Nous avons envoyé un code de vérification à
            </p>
            <p className="font-semibold text-[#0b5566] mb-6">{email}</p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center w-full">
                {error}
              </div>
            )}
            
            {!resendSuccess && !success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm text-center w-full">
                {cameFromLogin
                  ? 'Un code vient de vous être envoyé. Vérifiez votre boîte de réception.'
                  : 'Un code de vérification a été envoyé à votre adresse email.'}
              </div>
            )}
            {resendSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm text-center w-full">
                Un nouveau code a été envoyé à votre adresse email.
              </div>
            )}
            
            <p className="text-sm text-gray-500 mb-4">Entrez le code à 6 chiffres</p>
            
            <div className="flex gap-2 mb-6" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => {
                    if (el) inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleInputChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#0b5566] focus:outline-none focus:ring-2 focus:ring-[#a9ddf2] disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                />
              ))}
            </div>
            
            <button
              onClick={() => handleVerify()}
              disabled={loading || code.join('').length !== 6}
              className="w-full bg-[#0b5566] text-white py-3 rounded-full font-semibold hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Vérification...
                </span>
              ) : 'Vérifier'}
            </button>
            
            <div className="text-sm text-gray-500 text-center">
              <p className="mb-2">Vous n'avez pas reçu le code ?</p>
              <button
                onClick={handleResend}
                disabled={resending || countdown > 0}
                className="text-[#0b5566] hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
              >
                {resending ? 'Envoi en cours...' : countdown > 0 ? `Renvoyer le code (${countdown}s)` : 'Renvoyer le code'}
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 w-full text-center">
              <a href="/login" className="text-sm text-gray-500 hover:text-[#0b5566]">
                ← Retour à la connexion
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
