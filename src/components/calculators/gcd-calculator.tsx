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
import { Calculator as CalculatorIcon, Lightbulb, Divide, Hash, AlertTriangle, Info,  Sparkles } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  numberA: z.coerce.number().int('Must be an integer'),
  numberB: z.coerce.number().int('Must be an integer'),
  calculationMethod: z.enum(['euclidean', 'prime']).default('euclidean'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  gcd: number;
  steps: string[];
  simplifiedFraction: string;
  lcm: number;
  isCoprime: boolean;
}

export default function GcdCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calculationMethod: 'euclidean',
    },
  });

  const calculationMethod = form.watch('calculationMethod');

  const gcdEuclidean = (a: number, b: number): { gcd: number; steps: string[] } => {
    let steps: string[] = [];
    let x = Math.abs(a);
    let y = Math.abs(b);
    
    steps.push(`Start with: gcd(${x}, ${y})`);
    
    while (y !== 0) {
      const remainder = x % y;
      steps.push(`${x} % ${y} = ${remainder}`);
      steps.push(`gcd(${x}, ${y}) = gcd(${y}, ${remainder})`);
      [x, y] = [y, remainder];
    }
    
    steps.push(`GCD = ${x}`);
    return { gcd: x, steps };
  };

  const primeFactors = (n: number): number[] => {
    const factors = [];
    let divisor = 2;
    let num = Math.abs(n);
    
    while (num >= 2) {
      if (num % divisor === 0) {
        factors.push(divisor);
        num = num / divisor;
      } else {
        divisor++;
      }
    }
    return factors;
  };

  const gcdPrimeFactors = (a: number, b: number): { gcd: number; steps: string[] } => {
    const steps: string[] = [];
    const factorsA = primeFactors(a);
    const factorsB = primeFactors(b);
    
    steps.push(`Prime factors of ${a}: ${factorsA.join(' × ')}`);
    steps.push(`Prime factors of ${b}: ${factorsB.join(' × ')}`);
    
    const commonFactors: number[] = [];
    const tempB = [...factorsB];
    
    for (const factor of factorsA) {
      const index = tempB.indexOf(factor);
      if (index !== -1) {
        commonFactors.push(factor);
        tempB.splice(index, 1);
      }
    }
    
    steps.push(`Common prime factors: ${commonFactors.join(' × ')}`);
    
    const gcd = commonFactors.reduce((acc, factor) => acc * factor, 1);
    steps.push(`GCD = ${commonFactors.join(' × ')} = ${gcd}`);
    
    return { gcd, steps };
  };

  const lcm = (a: number, b: number, gcd: number): number => {
    return Math.abs(a * b) / gcd;
  };

  const simplifyFraction = (a: number, b: number, gcd: number): string => {
    if (b === 0) return "Undefined";
    const simplifiedA = a / gcd;
    const simplifiedB = b / gcd;
    return `${simplifiedA}/${simplifiedB}`;
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { numberA, numberB, calculationMethod } = data;
    
    let gcdResult: { gcd: number; steps: string[] };
    
    if (calculationMethod === 'euclidean') {
      gcdResult = gcdEuclidean(numberA, numberB);
    } else {
      gcdResult = gcdPrimeFactors(numberA, numberB);
    }
    
    const calculatedLcm = lcm(numberA, numberB, gcdResult.gcd);
    const simplifiedFraction = simplifyFraction(numberA, numberB, gcdResult.gcd);
    const isCoprime = gcdResult.gcd === 1;

    setResult({
      gcd: gcdResult.gcd,
      steps: gcdResult.steps,
      simplifiedFraction,
      lcm: calculatedLcm,
      isCoprime,
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'GCD Calculator',
        gcd: gcdResult.gcd,
        isCoprime,
        numbers: [numberA, numberB]
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("The GCD is useful for simplifying fractions and solving Diophantine equations. Try it with our Fraction Calculator for practical applications!");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      numberA: undefined,
      numberB: undefined,
      calculationMethod: 'euclidean',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const getCommonExamples = () => [
    { a: 48, b: 18, label: 'Common Example' },
    { a: 54, b: 24, label: 'Medium Numbers' },
    { a: 17, b: 13, label: 'Prime Numbers' },
    { a: 100, b: 75, label: 'Large Numbers' },
  ];

  const applyExample = (a: number, b: number) => {
    form.setValue('numberA', a);
    form.setValue('numberB', b);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Greatest Common Divisor (GCD) Calculator</CardTitle>
            <CardDescription>
              Find the greatest common divisor of two numbers using different algorithms
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="calculationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Method</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={cn(
                          "flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer transition-all",
                          field.value === 'euclidean' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                        )}>
                          <input
                            type="radio"
                            className="hidden"
                            checked={field.value === 'euclidean'}
                            onChange={() => field.onChange('euclidean')}
                          />
                          <div className="flex-1">
                            <div className="font-medium">Euclidean Algorithm</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Efficient division-based method
                            </div>
                          </div>
                        </label>
                        <label className={cn(
                          "flex items-center space-x-2 p-4 border-2 rounded-lg cursor-pointer transition-all",
                          field.value === 'prime' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                        )}>
                          <input
                            type="radio"
                            className="hidden"
                            checked={field.value === 'prime'}
                            onChange={() => field.onChange('prime')}
                          />
                          <div className="flex-1">
                            <div className="font-medium">Prime Factorization</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Using prime factors
                            </div>
                          </div>
                        </label>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="numberA"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number A</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="e.g., 48" 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numberB"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number B</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="e.g., 18" 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quick Examples */}
                <div className="pt-4 border-t">
                  <FormLabel className="text-sm">Quick Examples</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {getCommonExamples().map((example, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyExample(example.a, example.b)}
                      >
                        <div className="text-center">
                          <div className="font-medium">{example.a}, {example.b}</div>
                          <div className="text-muted-foreground">{example.label}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate GCD
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Calculation Steps */}
        {result && result.steps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Calculation Steps</CardTitle>
              <CardDescription>
                Step-by-step process using the {calculationMethod === 'euclidean' ? 'Euclidean Algorithm' : 'Prime Factorization'} method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center font-medium">
                      {index + 1}
                    </div>
                    <div className="font-mono text-sm">{step}</div>
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
            <CardTitle>GCD Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Greatest Common Divisor</p>
                  <p className="text-5xl font-bold my-2 text-primary">{result.gcd}</p>
                  {result.isCoprime && (
                    <Badge className="bg-green-500 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Coprime Numbers
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Simplified Fraction</p>
                    <p className="text-xl font-semibold font-mono">{result.simplifiedFraction}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">LCM</p>
                    <p className="text-xl font-semibold">{result.lcm}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Relationship</p>
                  <p className="text-lg font-semibold font-mono">
                    gcd(a,b) × lcm(a,b) = a × b
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {result.gcd} × {result.lcm} = {result.gcd * result.lcm}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Mathematical Insight</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.isCoprime ? 'These numbers are coprime (relatively prime), meaning they have no common factors other than 1.' :
                     result.gcd > 10 ? 'These numbers share several common factors, making them good candidates for fraction simplification.' :
                     'These numbers have a moderate GCD, useful for various mathematical applications and simplifications.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Enter two numbers to find their greatest common divisor.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Math Tip</CardTitle>
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
        <Tabs defaultValue="calculation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="algorithms">Algorithms</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is the GCD calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      The Greatest Common Divisor (GCD) of two integers is the largest positive integer 
                      that divides both numbers without leaving a remainder. There are several methods to compute it.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Euclidean Algorithm</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          gcd(a, b) = gcd(b, a mod b)
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Repeatedly replace (a, b) with (b, a mod b) until b becomes 0
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Prime Factorization</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            gcd = product of common prime factors
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Factor both numbers and multiply common factors
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Example: gcd(48, 18)</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            48 = 2⁴ × 3<br/>
                            18 = 2 × 3²<br/>
                            gcd = 2 × 3 = 6
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">GCD-LCM Relationship</h4>
                        <div className="font-mono bg-muted p-3 rounded-md text-xs">
                          gcd(a, b) × lcm(a, b) = a × b
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          This relationship allows easy computation of LCM from GCD
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Practical Applications of GCD</h3>
                <div className="space-y-4">
                  {[
                    {
                      application: "Fraction Simplification",
                      description: "Reduce fractions to their simplest form by dividing numerator and denominator by their GCD",
                      example: "12/18 = (12÷6)/(18÷6) = 2/3"
                    },
                    {
                      application: "Ratio Simplification",
                      description: "Simplify ratios in recipes, maps, and scale models",
                      example: "16:24 = (16÷8):(24÷8) = 2:3"
                    },
                    {
                      application: "Modular Arithmetic",
                      description: "Solve linear Diophantine equations and work with modular inverses",
                      example: "ax + by = gcd(a,b) has integer solutions"
                    },
                    {
                      application: "Cryptography",
                      description: "Used in RSA algorithm and other cryptographic protocols",
                      example: "Key generation relies on coprime numbers"
                    },
                    {
                      application: "Scheduling Problems",
                      description: "Find repeating patterns and cycles in periodic events",
                      example: "Two events every 6 and 8 days sync every 24 days (LCM)"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-blue-200 bg-blue-50">
                        {item.application}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground mt-1 font-mono">{item.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="algorithms">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Divide className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">GCD Algorithms Comparison</h3>
                </div>
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Euclidean Algorithm</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Time Complexity:</strong> O(log(min(a,b)))</p>
                      <p><strong>Space Complexity:</strong> O(1)</p>
                      <p><strong>Best For:</strong> Large numbers, efficient computation</p>
                      <p><strong>Method:</strong> Repeated division until remainder is zero</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">Prime Factorization</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Time Complexity:</strong> O(√n) for factorization</p>
                      <p><strong>Space Complexity:</strong> O(log(n)) for storing factors</p>
                      <p><strong>Best For:</strong> Educational purposes, small numbers</p>
                      <p><strong>Method:</strong> Factor both numbers and find common factors</p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Extended Euclidean Algorithm</h4>
                    <p className="text-sm">
                      Finds not only gcd(a,b) but also coefficients x and y such that:<br/>
                      <code className="font-mono">ax + by = gcd(a,b)</code><br/>
                      This is crucial for solving linear Diophantine equations and finding modular inverses.
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}