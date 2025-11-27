"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calculator as CalculatorIcon, Lightbulb, DollarSign, Percent, Calendar, TrendingUp, BarChart3, Info } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  principal: z.coerce.number().min(1, 'Principal must be at least $1').max(100000000, 'Principal amount is too large'),
  rate: z.coerce.number().min(0.01, 'Interest rate must be at least 0.01%').max(100, 'Interest rate is too high'),
  time: z.coerce.number().min(0.08, 'Time period must be at least 1 month').max(100, 'Time period is too long'),
  timeUnit: z.enum(['years', 'months', 'days']).default('years'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  interest: number;
  total: number;
  annualInterest: number;
  monthlyInterest: number;
  interestPercentage: number;
}

export default function SimpleInterestCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      principal: undefined,
      rate: undefined,
      time: undefined,
      timeUnit: 'years',
    },
  });

  const timeUnit = form.watch('timeUnit');

  const calculateSimpleInterest = (data: FormValues) => {
    let timeInYears = data.time;
    
    // Convert time to years based on selected unit
    if (data.timeUnit === 'months') {
      timeInYears = data.time / 12;
    } else if (data.timeUnit === 'days') {
      timeInYears = data.time / 365;
    }

    const interest = data.principal * (data.rate / 100) * timeInYears;
    const total = data.principal + interest;
    const annualInterest = data.principal * (data.rate / 100);
    const monthlyInterest = annualInterest / 12;
    const interestPercentage = (interest / data.principal) * 100;

    return { 
      interest, 
      total, 
      annualInterest,
      monthlyInterest,
      interestPercentage
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const calculationResult = calculateSimpleInterest(data); // rename to avoid collision
  setResult(calculationResult);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const result = await suggestNextStep({ 
        calculatorName: 'Simple Interest Calculator',
        principal: data.principal,
        rate: data.rate,
        time: data.time,
        timeUnit: data.timeUnit,
        totalInterest: calculationResult.interest
      });
      setSuggestion(result.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consider exploring compound interest to see how your savings could grow even faster with interest earned on interest.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      principal: undefined,
      rate: undefined,
      time: undefined,
      timeUnit: 'years',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const commonScenarios = [
    { type: 'Savings Account', rate: 0.5, time: 1, description: 'Basic bank savings' },
    { type: 'CD (Certificate of Deposit)', rate: 3.5, time: 5, description: 'Fixed-term investment' },
    { type: 'Personal Loan', rate: 12, time: 3, description: 'Unsecured borrowing' },
    { type: 'Auto Loan', rate: 6.5, time: 5, description: 'Vehicle financing' },
  ];

  const applyScenario = (scenario: typeof commonScenarios[0]) => {
    form.setValue('rate', scenario.rate);
    form.setValue('time', scenario.time);
    form.setValue('timeUnit', 'years');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Simple Interest Calculator</CardTitle>
            <CardDescription>
              Calculate how much interest you'll earn or pay with simple interest
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="principal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Principal Amount ($)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 10000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Annual Interest Rate (%)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g., 5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Time Period
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g., 2"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="timeUnit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="years">Years</SelectItem>
                              <SelectItem value="months">Months</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Common Scenarios */}
                <div className="pt-4 border-t">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4" />
                    Common Financial Scenarios
                  </CardDescription>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {commonScenarios.map((scenario, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="flex flex-col items-center p-2 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => applyScenario(scenario)}
                      >
                        <span className="font-semibold">{scenario.type}</span>
                        <span>{scenario.rate}% for {scenario.time} yr</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCalculator}
                >
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Interest
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Interest Breakdown Visualization */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Interest Breakdown</CardTitle>
              <CardDescription>
                How your money grows over the time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Original Principal</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${form.getValues('principal').toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Interest Earned</p>
                    <p className="text-2xl font-bold text-green-700">
                      ${result.interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-muted-foreground">Annual Interest</p>
                    <p className="font-semibold">${result.annualInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-muted-foreground">Monthly Interest</p>
                    <p className="font-semibold">${result.monthlyInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Educational Content */}
        <div className="mt-8">
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculation">Calculation</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="comparison">Simple vs Compound</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="explanation">
                  <AccordionTrigger>How is Simple Interest calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        Simple interest is calculated only on the principal amount, without considering any previously earned interest. It's commonly used for short-term loans and investments.
                      </p>
                      
                      <div className="bg-muted p-4 rounded-md text-center">
                        <p className="font-mono text-lg">
                          <span className="font-semibold">Interest</span> = <span className="text-primary">Principal</span> × <span className="text-primary">Rate</span> × <span className="text-primary">Time</span>
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Formula Components:</h4>
                          <ul className="space-y-1">
                            <li><b>Principal</b> = Initial amount</li>
                            <li><b>Rate</b> = Annual interest rate (as decimal)</li>
                            <li><b>Time</b> = Time period in years</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Example:</h4>
                          <p className="text-muted-foreground">
                            $1,000 at 5% for 3 years:<br />
                            $1,000 × 0.05 × 3 = $150 interest
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="examples">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Real-World Simple Interest Examples</h4>
                    <div className="space-y-3">
                      {[
                        {
                          scenario: 'Car Loan',
                          principal: '$20,000',
                          rate: '6% for 5 years',
                          interest: '$6,000',
                          total: '$26,000'
                        },
                        {
                          scenario: 'Savings Account',
                          principal: '$5,000',
                          rate: '2% for 3 years',
                          interest: '$300',
                          total: '$5,300'
                        },
                        {
                          scenario: 'Personal Loan',
                          principal: '$10,000',
                          rate: '10% for 2 years',
                          interest: '$2,000',
                          total: '$12,000'
                        }
                      ].map((example, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium mb-2">{example.scenario}</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Principal: {example.principal}</div>
                            <div>Rate: {example.rate}</div>
                            <div>Interest: {example.interest}</div>
                            <div>Total: {example.total}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-2">Simple Interest vs Compound Interest</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium text-green-600 mb-2">Simple Interest</div>
                            <ul className="text-muted-foreground list-disc list-inside space-y-1">
                              <li>Interest on principal only</li>
                              <li>Linear growth</li>
                              <li>Easy to calculate</li>
                              <li>Common for short-term loans</li>
                            </ul>
                          </div>
                          <div>
                            <div className="font-medium text-blue-600 mb-2">Compound Interest</div>
                            <ul className="text-muted-foreground list-disc list-inside space-y-1">
                              <li>Interest on principal + accumulated interest</li>
                              <li>Exponential growth</li>
                              <li>More complex calculation</li>
                              <li>Better for long-term investments</li>
                            </ul>
                          </div>
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
            <CardTitle>Interest Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Interest</p>
                  <p className="text-4xl font-bold text-green-600 my-2">
                    ${result.interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <Badge variant="secondary">
                    {result.interestPercentage.toFixed(2)}% of principal
                  </Badge>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">
                    ${result.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-semibold">${form.getValues('principal').toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Annual Rate</span>
                    <span className="font-semibold">{form.getValues('rate')}%</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Time Period</span>
                    <span className="font-semibold">
                      {form.getValues('time')} {timeUnit}
                    </span>
                  </div>
                </div>

                {/* Quick Insight */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What This Means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    Your ${form.getValues('principal').toLocaleString()} will grow to ${result.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} over {form.getValues('time')} {timeUnit}, earning you ${result.interest.toLocaleString(undefined, { maximumFractionDigits: 2 })} in simple interest.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your investment details to see interest calculations.
                </p>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Advice</CardTitle>
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