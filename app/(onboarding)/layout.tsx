import { AnimatedFlow } from "@/components/animated-flow";
import { UserThemeProvider } from "@/components/UserThemeProvider";
import {
  DEFAULT_THEME,
  ONBOARDING_THEME_COLOR,
} from "@/schemas/themeSchema";

export default function OnboardingGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh overflow-hidden bg-background font-sans">
      <div className="app-shell app-shell--full relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-background">
        <UserThemeProvider theme={DEFAULT_THEME} color={ONBOARDING_THEME_COLOR}>
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <AnimatedFlow
              flowSpeed={0.9}
              distortionWarp={1.4}
              filmGrain={0.25}
              rotationAngle={120}
              className="pointer-events-none absolute inset-0 min-h-0"
            />
            {children}
          </div>
        </UserThemeProvider>
      </div>
    </div>
  );
}
