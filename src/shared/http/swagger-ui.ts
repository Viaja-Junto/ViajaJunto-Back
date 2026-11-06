interface SwaggerResponse {
  url: string;
  ok: boolean;
  obj?: { accessToken?: unknown };
}

// Runs inside the browser: Swagger UI serializes it with toString(), so it must not use imports or outer variables.
export function captureAccessToken(response: SwaggerResponse): SwaggerResponse {
  const token = response.obj?.accessToken;

  if (
    response.ok &&
    typeof token === 'string' &&
    /\/auth\/(login|register)$/.test(response.url)
  ) {
    const { ui } = globalThis as unknown as {
      ui?: { preauthorizeApiKey?: (scheme: string, value: string) => void };
    };
    try {
      ui?.preauthorizeApiKey?.('bearer', token);
    } catch {
      // The sign-in itself succeeded; authorizing by hand still works.
    }
  }

  return response;
}

export const swaggerUiOptions = {
  persistAuthorization: true,
  responseInterceptor: captureAccessToken,
};
