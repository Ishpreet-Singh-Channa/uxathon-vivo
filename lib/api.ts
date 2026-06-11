type SendOtpInput = {
  email: string;
};

type VerifyOtpInput = {
  email: string;
  otp: string;
};

export type AuthTokens = {
  jwtToken: string;
};




export async function sendLoginOtp({ email }: SendOtpInput) {

  const res = await fetch("https://api.uxathon.com/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to send OTP.");
  }

  const data = await res.json();

  return {
    ok: true,
    message: data.detail || "",
  };
}

export async function verifyLoginOtp({ email, otp }: VerifyOtpInput): Promise<AuthTokens> {
  const res = await fetch("https://api.uxathon.com/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to verify OTP.");
  }
  const data = await res.json();
  return {
    jwtToken: data.data.token,
  };
}
