import LandingPage from "@/components/pages/landing-page";
import LandingRedirect from "@/components/pages/landing-redirect";

export default function Home() {
    return (
        <>
            <LandingRedirect />
            <LandingPage />
        </>
    );
}
