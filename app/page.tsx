"use client";

import { useEffect, useState } from "react";
import { ProductGrid } from "@/components/products/product-grid";
import { products } from "@/lib/products";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

interface SubscriptionWithOrder extends Payment {
  orders: Order;
}

export default function HomePage() {
  const [userSubscriptions, setUserSubscriptions] = useState<
    Map<string, SubscriptionWithOrder>
  >(new Map());
  const supabase = createClient();

  useEffect(() => {
    const fetchSubscriptions = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email) {
        return;
      }

      // Fetch active subscriptions for this user
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*, orders!inner(*)")
        .not("stripe_subscription_id", "is", null)
        .eq("orders.customer_email", user.email)
        .order("created_at", { ascending: false });

      if (paymentsData) {
        // Deduplicate by subscription_id and map by product name
        const subscriptionMap = new Map<string, SubscriptionWithOrder>();

        paymentsData.forEach((payment) => {
          const p = payment as unknown as SubscriptionWithOrder;
          if (
            p.stripe_subscription_id &&
            p.subscription_status !== "cancelled"
          ) {
            const subId = p.stripe_subscription_id;
            if (!subscriptionMap.has(subId)) {
              subscriptionMap.set(subId, p);
            }
          }
        });

        // Map subscriptions by product name for easy lookup
        const productSubscriptionMap = new Map<string, SubscriptionWithOrder>();
        subscriptionMap.forEach((subscription) => {
          const order = subscription.orders as Order;
          const items = Array.isArray(order.items)
            ? (order.items as Array<{ name?: string }>)
            : [];
          const productName = items[0]?.name;
          if (productName && typeof productName === "string") {
            productSubscriptionMap.set(productName, subscription);
          }
        });

        setUserSubscriptions(productSubscriptionMap);
      }
    };

    fetchSubscriptions();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/10 dark:to-purple-950/10">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10" />

        {/* Floating orbs */}
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        <div className="container relative mx-auto px-4 py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-4 px-4 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full text-sm font-semibold text-blue-600 dark:text-blue-400 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              ✨ Premium Software Subscriptions
            </div>

            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-zinc-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Supercharge Your
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Productivity
              </span>
            </h1>

            <p
              className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000"
              style={{
                animationDelay: "200ms",
                animationFillMode: "backwards",
              }}
            >
              Access premium tools and apps that transform how you work, create,
              and grow. Start your free trial today.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-1000"
              style={{
                animationDelay: "400ms",
                animationFillMode: "backwards",
              }}
            >
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Catalog */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
            Premium Apps & Tools
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Choose from our curated collection of professional-grade software
          </p>
        </div>
        <ProductGrid
          products={products}
          userSubscriptions={userSubscriptions}
        />
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 mb-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] group">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

          <h2 className="text-3xl md:text-4xl font-bold mb-4 relative z-10">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-lg mb-8 text-blue-100 max-w-2xl mx-auto relative z-10">
            Join thousands of professionals who trust our premium apps
          </p>
          <button className="relative z-10 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
            Start Your Free Trial
          </button>
        </div>
      </section>
    </div>
  );
}
