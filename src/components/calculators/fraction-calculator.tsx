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
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calculator as CalculatorIcon, X, Plus, Minus, Divide, Info, ArrowRight, Hash, Percent, Lightbulb } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';

const formSchema = z.object({
  n1: z.coerce.number().int('Numerator must be an integer.'),
  d1: z.coerce.number().int('Denominator must be an integer.').positive('Denominator must be positive.'),
  n2: z.coerce.number().int('Numerator must be an integer.'),
  d2: z.coerce.number().int('Denominator must be an integer.').positive('Denominator must be positive.'),
  operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  numerator: number;
  denominator: number;
  mixed: string;
  decimal: string;
  percentage: string;
  calculationSteps: string[];
}

// Helper function to find the greatest common divisor
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

export default function FractionCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operation: 'add',
    },
  });

  const getCalculationSteps = (data: FormValues, nResult: number, dResult: number, simplifiedN: number, simplifiedD: number) => {
    const { n1, d1, n2, d2, operation } = data;
    const steps: string[] = [];

    switch (operation) {
      case 'add':
        steps.push(`Find common denominator: ${d1} × ${d2} = ${d1 * d2}`);
        steps.push(`Convert fractions: ${n1}/${d1} = ${n1 * d2}/${d1 * d2}, ${n2}/${d2} = ${n2 * d1}/${d1 * d2}`);
        steps.push(`Add numerators: ${n1 * d2} + ${n2 * d1} = ${nResult}`);
        break;
      case 'subtract':
        steps.push(`Find common denominator: ${d1} × ${d2} = ${d1 * d2}`);
        steps.push(`Convert fractions: ${n1}/${d1} = ${n1 * d2}/${d1 * d2}, ${n2}/${d2} = ${n2 * d1}/${d1 * d2}`);
        steps.push(`Subtract numerators: ${n1 * d2} - ${n2 * d1} = ${nResult}`);
        break;
      case 'multiply':
        steps.push(`Multiply numerators: ${n1} × ${n2} = ${nResult}`);
        steps.push(`Multiply denominators: ${d1} × ${d2} = ${dResult}`);
        break;
      case 'divide':
        steps.push(`Multiply by reciprocal: ${n1}/${d1} × ${d2}/${n2}`);
        steps.push(`Multiply numerators: ${n1} × ${d2} = ${nResult}`);
        steps.push(`Multiply denominators: ${d1} × ${n2} = ${dResult}`);
        break;
    }

    if (nResult !== simplifiedN || dResult !== simplifiedD) {
      steps.push(`Simplify by GCD: ${nResult}/${dResult} ÷ ${gcd(Math.abs(nResult), Math.abs(dResult))} = ${simplifiedN}/${simplifiedD}`);
    }

    return steps;
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    let nResult: number, dResult: number;
    const { n1, d1, n2, d2, operation } = data;

    switch (operation) {
      case 'add':
        nResult = n1 * d2 + n2 * d1;
        dResult = d1 * d2;
        break;
      case 'subtract':
        nResult = n1 * d2 - n2 * d1;
        dResult = d1 * d2;
        break;
      case 'multiply':
        nResult = n1 * n2;
        dResult = d1 * d2;
        break;
      case 'divide':
        nResult = n1 * d2;
        dResult = d1 * n2;
        break;
    }
    
    if (dResult === 0) {
        form.setError("root", { message: "Result has a zero denominator, cannot calculate."});
        setResult(null);
        return;
    }

    const commonDivisor = gcd(Math.abs(nResult), Math.abs(dResult));
    const simplifiedN = nResult / commonDivisor;
    const simplifiedD = dResult / commonDivisor;

    let mixed = '';
    if (Math.abs(simplifiedN) >= simplifiedD) {
      const whole = Math.trunc(simplifiedN / simplifiedD);
      const remN = Math.abs(simplifiedN % simplifiedD);
      if (remN !== 0) {
        mixed = `${whole} ${remN}/${simplifiedD}`;
      } else {
        mixed = `${whole}`;
      }
    }

    const calculationSteps = getCalculationSteps(data, nResult, dResult, simplifiedN, simplifiedD);
    const percentage = ((simplifiedN / simplifiedD) * 100).toFixed(2) + '%';

    const resultData = {
      numerator: simplifiedN,
      denominator: simplifiedD,
      mixed: mixed,
      decimal: (simplifiedN / simplifiedD).toFixed(6).replace(/\.?0+$/, ''),
      percentage,
      calculationSteps
    };

    setResult(resultData);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Fraction Calculator',
        operation: data.operation,
        result: resultData
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Remember that fractions represent parts of a whole. Visualizing fractions as slices of pizza or pie can help understand the operations better.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({ operation: 'add', n1: undefined, d1: undefined, n2: undefined, d2: undefined });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };
  
  const operation = form.watch('operation');
  const operationIcons: {[key: string]: React.ReactNode} = {
    add: <Plus className="h-5 w-5" />,
    subtract: <Minus className="h-5 w-5" />,
    multiply: <X className="h-5 w-5" />,
    divide: <Divide className="h-5 w-5" />,
  };

  const operationNames = {
    add: 'Addition',
    subtract: 'Subtraction',
    multiply: 'Multiplication',
    divide: 'Division'
  };

  const commonFractions = [
    { label: '½', n: 1, d: 2 },
    { label: '⅓', n: 1, d: 3 },
    { label: '¼', n: 1, d: 4 },
    { label: '⅔', n: 2, d: 3 },
    { label: '¾', n: 3, d: 4 },
    { label: '⅛', n: 1, d: 8 },
  ];

  const applyCommonFraction = (fraction: typeof commonFractions[0], position: 1 | 2) => {
    if (position === 1) {
      form.setValue('n1', fraction.n);
      form.setValue('d1', fraction.d);
    } else {
      form.setValue('n2', fraction.n);
      form.setValue('d2', fraction.d);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Fraction Calculator</CardTitle>
            <CardDescription>
              Perform operations with fractions and see step-by-step solutions
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <CardContent className="p-6">
                {/* Common Fractions Quick Select */}
                <div className="mb-6">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <Hash className="h-4 w-4" />
                    Common Fractions
                  </CardDescription>
                  <div className="grid grid-cols-6 gap-2 text-sm">
                    {commonFractions.map((fraction, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="flex flex-col items-center p-2 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => applyCommonFraction(fraction, 1)}
                      >
                        <span className="text-lg">{fraction.label}</span>
                        <span className="text-xs">{fraction.n}/{fraction.d}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Fraction Inputs */}
                <div className="flex items-center justify-around mb-8">
                  {/* First Fraction */}
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-sm text-muted-foreground">First Fraction</Label>
                    <div className="flex flex-col items-center gap-1 w-24">
                      <FormField control={form.control} name="n1" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Num" 
                              className="text-center" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Separator className="h-1 bg-foreground w-full" />
                      <FormField control={form.control} name="d1" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Den" 
                              className="text-center" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  
                  {/* Operation */}
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Operation</Label>
                    <div className="flex-shrink-0 mx-4 p-3 bg-primary/10 rounded-lg">
                      {operationIcons[operation]}
                    </div>
                  </div>

                  {/* Second Fraction */}
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-sm text-muted-foreground">Second Fraction</Label>
                    <div className="flex flex-col items-center gap-1 w-24">
                      <FormField control={form.control} name="n2" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Num" 
                              className="text-center" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Separator className="h-1 bg-foreground w-full" />
                      <FormField control={form.control} name="d2" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Den" 
                              className="text-center" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Operation Selection */}
                <FormField
                  control={form.control}
                  name="operation"
                  render={({ field }) => (
                    <FormItem className="mt-8">
                      <Label className="flex items-center gap-2 mb-4">
                        <Info className="h-4 w-4" />
                        Select Operation
                      </Label>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-4 gap-4"
                      >
                        <Label className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors">
                          <FormControl>
                            <RadioGroupItem value="add" className="sr-only" />
                          </FormControl>
                          <Plus className="h-6 w-6 mb-2" />
                          <span className="text-sm">Add</span>
                        </Label>
                        <Label className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors">
                          <FormControl>
                            <RadioGroupItem value="subtract" className="sr-only" />
                          </FormControl>
                          <Minus className="h-6 w-6 mb-2" />
                          <span className="text-sm">Subtract</span>
                        </Label>
                        <Label className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors">
                          <FormControl>
                            <RadioGroupItem value="multiply" className="sr-only" />
                          </FormControl>
                          <X className="h-6 w-6 mb-2" />
                          <span className="text-sm">Multiply</span>
                        </Label>
                        <Label className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary transition-colors">
                          <FormControl>
                            <RadioGroupItem value="divide" className="sr-only" />
                          </FormControl>
                          <Divide className="h-6 w-6 mb-2" />
                          <span className="text-sm">Divide</span>
                        </Label>
                      </RadioGroup>
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" /> Calculate
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Calculation Steps */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Calculation Steps</CardTitle>
              <CardDescription>
                Step-by-step solution for {operationNames[operation]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.calculationSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Badge variant="secondary" className="mt-0.5">
                      {index + 1}
                    </Badge>
                    <p className="text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Educational Content */}
        <div className="mt-8">
          <Tabs defaultValue="operations" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
            </TabsList>

            <TabsContent value="operations">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Fraction Operations Guide</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="font-medium text-green-600">Addition & Subtraction</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Find common denominator</li>
                          <li>Convert both fractions</li>
                          <li>Add/subtract numerators</li>
                          <li>Simplify result</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="font-medium text-blue-600">Multiplication & Division</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Multiply numerators and denominators</li>
                          <li>For division, multiply by reciprocal</li>
                          <li>Simplify result</li>
                          <li>Convert to mixed number if needed</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Common Fraction Examples</h4>
                    <div className="space-y-3 text-sm">
                      {[
                        { problem: '½ + ⅓', solution: '3/6 + 2/6 = 5/6' },
                        { problem: '¾ × ⅔', solution: '6/12 = 1/2' },
                        { problem: '⅘ ÷ ½', solution: '⅘ × 2/1 = 8/5 = 1 3/5' },
                        { problem: '⅚ - ¼', solution: '10/12 - 3/12 = 7/12' },
                      ].map((example, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-mono">{example.problem} = {example.solution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="concepts">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Fraction Concepts</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Hash className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Simplifying Fractions</div>
                          <p className="text-muted-foreground">
                            Divide numerator and denominator by their greatest common divisor (GCD) to get the simplest form.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Percent className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <div className="font-medium">Mixed Numbers</div>
                          <p className="text-muted-foreground">
                            When the numerator is larger than the denominator, convert to a whole number plus a proper fraction.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Calculation Result</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Simplified Fraction</p>
                  <div className="text-4xl font-bold text-primary my-2">
                    <sup>{result.numerator}</sup>&frasl;<sub>{result.denominator}</sub>
                  </div>
                </div>

                {result.mixed && (
                  <div>
                    <p className="text-sm text-muted-foreground">Mixed Number</p>
                    <p className="text-2xl font-bold">{result.mixed}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Decimal</p>
                    <p className="text-xl font-bold">{result.decimal}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Percentage</p>
                    <p className="text-xl font-bold text-green-600">{result.percentage}</p>
                  </div>
                </div>

                {/* Operation Summary */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Operation Summary</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {operationNames[operation]} completed. The result has been simplified to its lowest terms.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter fractions and select an operation to see the result.
                </p>
              </div>
            )}

            {form.formState.errors.root && (
              <p className="text-destructive text-sm font-medium">{form.formState.errors.root.message}</p>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Math Tip</CardTitle>
                </div>
                {suggestionLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{suggestion}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}