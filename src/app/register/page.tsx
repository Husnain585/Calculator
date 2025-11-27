"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calculator, ShieldCheck } from "lucide-react";
import Link from "next/link";

// ---------------- SCHEMA ---------------- //
const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Minimum 6 characters required."),
  registerAsAdmin: z.boolean().default(false),
});

type RegisterFormValues = z.infer<typeof formSchema>;

// ---------------- COMPONENT ---------------- //
export default function RegisterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      registerAsAdmin: false,
    },
  });

  // ---------------- REAL-TIME ADMIN CHECK ---------------- //
  useEffect(() => {
    const q = query(collection(db, "users"), where("isAdmin", "==", true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAdminExists(!snapshot.empty); // true if admin exists
    });

    return () => unsubscribe();
  }, []);

  // -------------- ERROR NORMALIZER ---------------- //
  const normalizeFirebaseError = (error: any) => {
    if (!error?.code) return "Unexpected error occurred.";

    const map: Record<string, string> = {
      "auth/email-already-in-use": "Email already in use.",
      "auth/invalid-email": "Invalid email provided.",
      "auth/operation-not-allowed": "Email/password accounts are disabled.",
      "auth/weak-password": "Password is too weak.",
    };

    return map[error.code] || "Registration failed.";
  };

  // -------------- SUBMIT HANDLER ---------------- //
  const onSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    setLoading(true);

    try {
      const { fullName, email, password, registerAsAdmin } = data;

      // 1️⃣ Create account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2️⃣ Update Firebase Auth profile
      await updateProfile(user, { displayName: fullName });

      // 3️⃣ Create Firestore user
      await setDoc(doc(db, "users", user.uid), {
        fullName,
        email,
        isAdmin: registerAsAdmin,
        createdAt: serverTimestamp(),
      });

      // 4️⃣ Set admin claim via API if registering as admin
      if (registerAsAdmin) {
        await fetch("/api/setAdmin", {
          method: "POST",
          body: JSON.stringify({ uid: user.uid }),
        });
      }

      toast({ title: "Account created!", description: `Welcome, ${fullName}!` });

      // 5️⃣ Redirect
      router.push(registerAsAdmin ? "/admin" : "/");

      // Reset the form
      form.reset();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({ variant: "destructive", title: "Registration Failed", description: normalizeFirebaseError(error) });
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UI ---------------- //
  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12">
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
          <Calculator className="h-10 w-10 text-primary mx-auto mb-2" />
          <h1 className="text-3xl font-bold">Create an account</h1>
          <p className="text-muted-foreground">Enter your details to get started</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="example@mail.com" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={loading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="registerAsAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading || adminExists} // dynamic disable
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Register as Admin
                    </FormLabel>
                    {adminExists && <p className="text-xs text-muted-foreground mt-1">An admin already exists</p>}
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm">
          Already have an account? <Link href="/login" className="underline">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
