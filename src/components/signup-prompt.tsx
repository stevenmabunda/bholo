
import Link from "next/link";
import { Button } from "./ui/button";

export function SignupPrompt() {
    return (
        <div className="p-8 text-center border-t">
            <h2 className="text-xl font-bold">Want to see more?</h2>
            <p className="text-muted-foreground mb-4">
                Create an account or sign in to view more posts, follow your favorite creators, and join the conversation.
            </p>
            <div className="flex justify-center gap-4">
                <Button asChild>
                    <Link href="/signup">Create account</Link>
                </Button>
                <Button variant="secondary" asChild>
                    <Link href="/">Sign In</Link>
                </Button>
            </div>
        </div>
    );
}
