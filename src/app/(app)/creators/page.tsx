
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Gem, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { applyForCreatorProgram } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import Image from "next/image";

const tiers = [
  {
    name: 'Rising Star',
    price: 'Open to All',
    priceDetail: 'Entry-level Creators',
    icon: Star,
    eligibility: [
      'At least 25 football-related posts per month',
      'Content is original & follows community guidelines',
      'Minimum 100 total engagements/month',
    ],
    perks: [
      'Creator Badge',
      'Mobile data or airtime rewards',
      'Access to creator tips & tools',
      'Referral bonus: Get extra data or airtime when others join using your code',
    ],
    featured: false,
  },
  {
    name: 'Pro Creator',
    price: 'For Consistent Creators',
    priceDetail: 'High-Impact',
    icon: Gem,
    eligibility: [
      'Meet Rising Star criteria',
      'At least 30 football-related posts per month',
      '1,500+ monthly engagements or a strong follower base',
    ],
    perks: [
      'Monthly rewards including cash (R250–R750)',
      'Pro Creator Badge',
      'Featured placement in trending tabs',
      'Exclusive BHOLO merch drops',
      'Referral income: Earn cash when creators sign up using your code',
    ],
    featured: true,
  },
];

export default function CreatorsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const handleApply = async (tierName: string) => {
    if (!user) {
        toast({ variant: 'destructive', description: "You must be logged in to apply." });
        return;
    }
    setLoadingTier(tierName);
    try {
      const result = await applyForCreatorProgram(user.id, tierName);
      if ('mailto' in result) {
        window.location.href = result.mailto;
        setApplicationSubmitted(true);
      } else {
        toast({ variant: 'destructive', description: result.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', description: "An unexpected error occurred." });
    } finally {
      setLoadingTier(null);
    }
  };

  if (applicationSubmitted) {
    return (
       <div className="flex flex-col min-h-screen bg-background text-foreground">
         <main className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-md mx-auto text-center space-y-6">
                <Alert className="text-left border-muted-foreground/50">
                    <Check className="h-5 w-5" />
                    <AlertTitle className="text-lg font-bold">Application Submitted!</AlertTitle>
                    <AlertDescription className="text-muted-foreground">
                        Thank you for applying. Your account will be reviewed and you will receive a confirmation within 24 hours.
                    </AlertDescription>
                </Alert>
                <Button asChild size="lg">
                    <Link href="/home">Back to Home</Link>
                </Button>
            </div>
         </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-5xl mx-auto w-full">
          <div className="text-center mb-12 space-y-4">
             <Image src="/bholo_logo.png" alt="BHOLO Logo" width={150} height={60} priority className="mx-auto" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              BHOLO Creator Program
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              From fan to football content king. Create content, build your community, and get rewarded.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {tiers.map((tier) => (
              <Card key={tier.name} className={cn(
                "flex flex-col border-2 bg-card",
                tier.featured ? "border-primary" : 'border-border'
              )}>
                <CardHeader className="text-center">
                  <tier.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <p className="font-bold text-xl">{tier.price}</p>
                  <CardDescription>{tier.priceDetail}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between space-y-8 p-4">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3">Eligibility</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {tier.eligibility.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Perks</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {tier.perks.map((item, index) => (
                          <li key={index} className="flex items-start">
                            <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                   <Button 
                    onClick={() => handleApply(tier.name)}
                    disabled={loadingTier !== null}
                    className={cn("mt-4", !tier.featured && "bg-foreground/80 hover:bg-foreground")}>
                      {loadingTier === tier.name ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        'Get Started'
                      )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
