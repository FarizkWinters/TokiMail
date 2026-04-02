import { useQuery } from "@tanstack/react-query";

interface AppConfig {
  appName: string;
  appTagline: string;
  version: string;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: "TokiMail",
  appTagline: "Disposable email. Instant. Private.",
  version: "0.1.0",
};

async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch("/api/config");
  if (!res.ok) return DEFAULT_CONFIG;
  return res.json();
}

export function useAppConfig() {
  const { data } = useQuery<AppConfig>({
    queryKey: ["app-config"],
    queryFn: fetchConfig,
    staleTime: Infinity,
    placeholderData: DEFAULT_CONFIG,
  });
  return data ?? DEFAULT_CONFIG;
}
