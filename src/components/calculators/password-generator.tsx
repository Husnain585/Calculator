"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Lightbulb, Shuffle, Copy, Lock, Shield, Zap, AlertTriangle, Info, Key, Eye, EyeOff } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  length: z.number().min(4).max(64),
  includeUppercase: z.boolean(),
  includeLowercase: z.boolean(),
  includeNumbers: z.boolean(),
  includeSymbols: z.boolean(),
  excludeSimilar: z.boolean().default(true),
  excludeAmbiguous: z.boolean().default(false),
}).refine(data => data.includeUppercase || data.includeLowercase || data.includeNumbers || data.includeSymbols, {
  message: 'At least one character type must be selected.',
  path: ['includeUppercase'],
});

type FormValues = z.infer<typeof formSchema>;

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  description: string;
}

export default function PasswordGenerator() {
  const [result, setResult] = useState<string>('');
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordHistory, setPasswordHistory] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      length: 16,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: true,
      excludeSimilar: true,
      excludeAmbiguous: false,
    },
  });

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    
    // Length score
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    
    // Penalize common patterns
    if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
    if (/123|abc|password/i.test(password)) score -= 2; // Common patterns
    
    score = Math.max(0, Math.min(5, score));
    
    const strengths = {
      0: { label: 'Very Weak', color: 'bg-red-500', description: 'Easily guessable' },
      1: { label: 'Weak', color: 'bg-orange-500', description: 'Vulnerable to attacks' },
      2: { label: 'Fair', color: 'bg-yellow-500', description: 'Moderate security' },
      3: { label: 'Good', color: 'bg-blue-500', description: 'Reasonably secure' },
      4: { label: 'Strong', color: 'bg-green-500', description: 'Very secure' },
      5: { label: 'Very Strong', color: 'bg-emerald-500', description: 'Excellent security' },
    };
    
    return { score, ...strengths[score as keyof typeof strengths] };
  };

  const generatePassword = (data: FormValues) => {
    const { length, includeUppercase, includeLowercase, includeNumbers, includeSymbols, excludeSimilar, excludeAmbiguous } = data;
    
    let uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    let numberChars = '0123456789';
    let symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Exclude similar characters
    if (excludeSimilar) {
      uppercaseChars = uppercaseChars.replace(/[OIL]/g, '');
      lowercaseChars = lowercaseChars.replace(/[oil]/g, '');
      numberChars = numberChars.replace(/[01]/g, '');
    }
    
    // Exclude ambiguous characters
    if (excludeAmbiguous) {
      symbolChars = symbolChars.replace(/[{}[]|;:,.<>?]/g, '');
    }

    let charSet = '';
    if (includeUppercase) charSet += uppercaseChars;
    if (includeLowercase) charSet += lowercaseChars;
    if (includeNumbers) charSet += numberChars;
    if (includeSymbols) charSet += symbolChars;

    if (charSet === '') {
        setResult('');
        return '';
    }

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charSet[array[i] % charSet.length];
    }
    
    return password;
  }

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const newPassword = generatePassword(data);
    setResult(newPassword);
    
    // Add to history (keep last 5)
    setPasswordHistory(prev => [newPassword, ...prev.slice(0, 4)]);
    
    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Password Generator',
        passwordLength: data.length,
        strength: calculatePasswordStrength(newPassword).label
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Use a unique password for every account. Consider a password manager to keep track of them securely and enable two-factor authentication where available.");
    } finally {
      setSuggestionLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    toast({ 
      title: 'Password Copied!', 
      description: 'Password has been copied to clipboard.',
      duration: 2000
    });
  }

  const regeneratePassword = () => {
    const currentValues = form.getValues();
    const newPassword = generatePassword(currentValues);
    setResult(newPassword);
    setPasswordHistory(prev => [newPassword, ...prev.slice(0, 4)]);
  }

  const strength = calculatePasswordStrength(result);
  const estimatedCrackTime = () => {
    const times = {
      0: 'Instantly',
      1: 'Seconds',
      2: 'Hours',
      3: 'Months',
      4: 'Years',
      5: 'Centuries'
    };
    return times[strength.score as keyof typeof times] || 'Unknown';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Password Generator</CardTitle>
            <CardDescription>
              Create strong, secure passwords with customizable options
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-8">
                <FormField
                  control={form.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-2">
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          Password Length
                        </FormLabel>
                        <span className="text-lg font-bold text-primary">{field.value} characters</span>
                      </div>
                      <FormControl>
                        <div className="space-y-4">
                          <Slider
                            min={4}
                            max={64}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Short (4)</span>
                            <span>Recommended (12-16)</span>
                            <span>Long (64)</span>
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    Character Types
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="includeUppercase"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium cursor-pointer">Uppercase</FormLabel>
                            <p className="text-xs text-muted-foreground">A-Z</p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="includeLowercase"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium cursor-pointer">Lowercase</FormLabel>
                            <p className="text-xs text-muted-foreground">a-z</p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="includeNumbers"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium cursor-pointer">Numbers</FormLabel>
                            <p className="text-xs text-muted-foreground">0-9</p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="includeSymbols"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium cursor-pointer">Symbols</FormLabel>
                            <p className="text-xs text-muted-foreground">!@#$%</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.formState.errors.includeUppercase && (
                    <FormMessage>{form.formState.errors.includeUppercase.message}</FormMessage>
                  )}
                </div>

                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Security Options
                  </FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="excludeSimilar"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium cursor-pointer">Exclude Similar</FormLabel>
                            <p className="text-xs text-muted-foreground">Remove I, l, 1, O, 0</p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="excludeAmbiguous"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3 space-y-0 border rounded-lg p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium cursor-pointer">Exclude Ambiguous</FormLabel>
                            <p className="text-xs text-muted-foreground">Remove {}[]|;:&lt;&gt;</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="submit" className="flex-1">
                  <Shuffle className="mr-2 h-4 w-4" />
                  Generate Password
                </Button>
                {result && (
                  <Button type="button" variant="outline" onClick={regeneratePassword}>
                    <Shuffle className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Password History */}
        {passwordHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Passwords</CardTitle>
              <CardDescription>
                Your recently generated passwords (not stored)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {passwordHistory.map((password, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {password}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(password);
                        toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Generated Password</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div className="relative">
                  <Input 
                    value={result} 
                    readOnly 
                    type={showPassword ? "text" : "password"}
                    className="pr-20 text-lg font-mono tracking-wider h-14 text-center" 
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Strength</span>
                    <Badge className={`${strength.color} text-white`}>
                      {strength.label}
                    </Badge>
                  </div>
                  <Progress value={(strength.score / 5) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{strength.description}</span>
                    <span>Estimated crack time: {estimatedCrackTime()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Length</p>
                    <p className="font-semibold">{result.length} chars</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entropy</p>
                    <p className="font-semibold">
                      {Math.log2(
                        (form.watch('includeUppercase') ? 26 : 0) +
                        (form.watch('includeLowercase') ? 26 : 0) +
                        (form.watch('includeNumbers') ? 10 : 0) +
                        (form.watch('includeSymbols') ? 10 : 0)
                      ) * result.length | 0} bits
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Security Assessment</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {strength.score >= 4 ? 'Excellent password strength! This would take centuries to crack with current technology.' :
                     strength.score >= 3 ? 'Good password strength. Suitable for most online accounts and services.' :
                     strength.score >= 2 ? 'Moderate strength. Consider increasing length or adding more character types.' :
                     'Weak password. Increase length and use more character types for better security.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Configure options and generate a secure password.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Security Tip</CardTitle>
                </CardHeader>
                <CardDescription>
                  {suggestionLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    suggestion
                  )}
                </CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Content */}
      <div className="lg:col-span-3 mt-8">
        <Tabs defaultValue="guidelines" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guidelines">Password Guidelines</TabsTrigger>
            <TabsTrigger value="security">Security Best Practices</TabsTrigger>
            <TabsTrigger value="technology">Password Technology</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guidelines">
            <Accordion type="single" collapsible>
              <AccordionItem value="strength">
                <AccordionTrigger>What makes a password strong?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      A strong password combines length, complexity, and unpredictability to resist 
                      various attack methods including brute force, dictionary attacks, and social engineering.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Key Elements of Strong Passwords</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p><strong>Length:</strong> Minimum 12 characters, ideally 16+</p>
                            <p><strong>Complexity:</strong> Mix of character types</p>
                            <p><strong>Unpredictability:</strong> No common words or patterns</p>
                          </div>
                          <div className="space-y-2">
                            <p><strong>Uniqueness:</strong> Different for each account</p>
                            <p><strong>Randomness:</strong> No personal information</p>
                            <p><strong>Freshness:</strong> Changed periodically</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Password Strength Metrics</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>Entropy:</strong> Measures unpredictability in bits</p>
                          <p><strong>Character Set Size:</strong> Larger sets = stronger passwords</p>
                          <p><strong>Crack Time:</strong> Estimated time to brute force</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Security Best Practices</h3>
                <div className="space-y-4">
                  {[
                    {
                      practice: "Use Unique Passwords",
                      description: "Never reuse passwords across different accounts to prevent credential stuffing attacks",
                      importance: "Critical"
                    },
                    {
                      practice: "Enable 2FA/MFA",
                      description: "Add an extra layer of security with two-factor or multi-factor authentication",
                      importance: "Critical"
                    },
                    {
                      practice: "Use Password Managers",
                      description: "Securely store and generate strong, unique passwords for all your accounts",
                      importance: "High"
                    },
                    {
                      practice: "Regular Updates",
                      description: "Change passwords periodically, especially after security breaches",
                      importance: "Medium"
                    },
                    {
                      practice: "Avoid Personal Info",
                      description: "Don't use names, birthdays, or other easily guessable personal information",
                      importance: "High"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          item.importance === 'Critical' ? 'border-red-200 bg-red-50' : 
                          item.importance === 'High' ? 'border-orange-200 bg-orange-50' : 
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        {item.importance}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.practice}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technology">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Modern Password Technology</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Cryptographic Hashing</h4>
                    <p className="text-muted-foreground">
                      Passwords are stored as cryptographic hashes (like bcrypt, Argon2) making them 
                      irreversible while allowing verification. Modern algorithms include salt and 
                      work factors to resist brute-force attacks.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Password Entropy</h4>
                    <p className="text-muted-foreground">
                      Entropy measures password unpredictability in bits. A 12-character password 
                      with mixed characters has ~72 bits of entropy, requiring ~2⁷² attempts to crack - 
                      computationally infeasible with current technology.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold">Important Security Note</h4>
                    </div>
                    <p className="text-sm">
                      This generator creates passwords locally in your browser. No passwords are 
                      transmitted over the internet or stored on our servers. However, always ensure 
                      you're using a secure, updated browser and be cautious of browser extensions 
                      that might capture your data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}