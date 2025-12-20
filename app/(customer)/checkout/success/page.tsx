"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!orderId) {
      router.push("/");
    }
  }, [orderId, router]);

  if (!mounted || !orderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
        <div className="animate-pulse text-zinc-600 dark:text-zinc-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-black">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:bg-zinc-900/80">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="group relative inline-flex items-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            {/* Christmas Hat */}
            <svg
              className="absolute -top-4 -right-1 w-10 h-10 z-10 group-hover:scale-110 transition-transform duration-300"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Hat cone - curved to the right */}
              <path
                d="M8 16 Q12 8 20 8 Q24 8 26 12 L26 20 Q24 24 20 24 Q16 24 12 20 Z"
                fill="#DC2626"
                className="drop-shadow-sm"
              />
              {/* White brim - curved */}
              <path
                d="M10 20 Q16 18 22 20 Q24 20.5 24 22 Q22 23 20 22.5 Q16 22 12 22.5 Q10 22.5 10 20 Z"
                fill="#FFFFFF"
              />
              {/* White pom-pom */}
              <circle
                cx="24"
                cy="10"
                r="3"
                fill="#FFFFFF"
                className="drop-shadow-sm"
              />
            </svg>
            VoiceVerify
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Card className="border-2 border-green-200 dark:border-green-800 shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Hero Section with Image */}
              <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 p-12 text-center overflow-hidden">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-green-400 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-10 right-10 w-40 h-40 bg-emerald-400 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                {/* Success Icon with Animation */}
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg mb-6 transform hover:scale-110 transition-transform duration-300 hover:rotate-12">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
                    Order Placed Successfully! 🎉
                  </h1>

                  <p className="text-xl text-zinc-700 dark:text-zinc-300 max-w-2xl mx-auto leading-relaxed">
                    Your order has been successfully placed! You will receive a
                    confirmation call shortly to verify your order details and
                    help you get started.
                  </p>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8 md:p-12 space-y-8">
                {/* Order ID */}
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide">
                    Order Reference
                  </p>
                  <p className="font-mono text-2xl font-bold bg-zinc-100 dark:bg-zinc-800 px-6 py-3 rounded-lg inline-block border-2 border-zinc-200 dark:border-zinc-700 hover:border-green-400 dark:hover:border-green-500 transition-colors duration-300">
                    {orderId.substring(0, 8).toUpperCase()}
                  </p>
                </div>

                {/* Information Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-xl border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                      <svg
                        className="w-6 h-6 text-blue-600 dark:text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-2">
                        What Happens Next?
                      </h3>
                      <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                        Our team will contact you via phone within the next few
                        minutes to confirm your subscription and help you get
                        started. Please keep your phone nearby and answer when
                        we call. This verification call ensures your account is
                        set up correctly and you can start enjoying your premium
                        features immediately.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone Icon with Hover Effect */}
                <div className="flex justify-center">
                  <div className="group relative">
                    <div className="absolute inset-0 bg-green-400 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <svg
                        className="w-10 h-10 text-white transform group-hover:rotate-12 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-6 text-center">
                  <Link href="/">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      Explore More Apps
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
