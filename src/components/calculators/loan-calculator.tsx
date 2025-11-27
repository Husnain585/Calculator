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
import { Calculator as CalculatorIcon, Lightbulb, DollarSign, Calendar, Percent, TrendingUp, Info, BanknoteIcon } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  loanAmount: z.coerce.number().min(100, 'Loan amount must be at least $100').max(10000000, 'Loan amount is too large'),
  loanTerm: z.coerce.number().int().min(1, 'Loan term must be at least 1 year').max(50, 'Loan term cannot exceed 50 years'),
  interestRate: z.coerce.number().min(0.1, 'Interest rate must be at least 0.1%').max(50, 'Interest rate is too high'),
  loanType: z.enum(['personal', 'auto', 'mortgage', 'student']).default('personal'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  interestToPrincipalRatio: number;
  payOffDate: string;
}

export default function LoanCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanType: 'personal',
    }
  });

  const loanType = form.watch('loanType');

  const getLoanDefaults = (type: string) => {
    const defaults = {
      personal: { term: 5, rate: 10.5 },
      auto: { term: 5, rate: 6.5 },
      mortgage: { term: 30, rate: 7.0 },
      student: { term: 10, rate: 5.5 }
    };
    return defaults[type as keyof typeof defaults] || defaults.personal;
  };

  const updateLoanDefaults = (type: string) => {
    const defaults = getLoanDefaults(type);
    form.setValue('loanTerm', defaults.term);
    form.setValue('interestRate', defaults.rate);
  };

  const calculateLoan = (data: FormValues) => {
    const principal = data.loanAmount;
    const monthlyInterestRate = data.interestRate / 100 / 12;
    const numberOfPayments = data.loanTerm * 12;

    const monthlyPayment =
      principal *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;
    const interestToPrincipalRatio = totalInterest / principal;

    // Calculate pay-off date
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + numberOfPayments);
    const payOffDate = startDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });

    return { 
      monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
      totalPayment: isFinite(totalPayment) ? totalPayment : 0,
      totalInterest: isFinite(totalInterest) ? totalInterest : 0,
      interestToPrincipalRatio,
      payOffDate
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateLoan(data);
    setResult(result);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Loan Calculator',
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        loanTerm: data.loanTerm,
        loanType: data.loanType,
        monthlyPayment: result.monthlyPayment,
        totalInterest: result.totalInterest
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consider making extra payments to reduce your loan term and total interest paid. Even small additional payments can save you thousands over the life of the loan.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      loanAmount: undefined,
      loanTerm: getLoanDefaults(loanType).term,
      interestRate: getLoanDefaults(loanType).rate,
      loanType: 'personal',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan', icon: '👤' },
    { value: 'auto', label: 'Auto Loan', icon: '🚗' },
    { value: 'mortgage', label: 'Mortgage', icon: '🏠' },
    { value: 'student', label: 'Student Loan', icon: '🎓' },
  ];

  const getAffordabilityMessage = (monthlyPayment: number, loanAmount: number) => {
    const incomeRatio = monthlyPayment / 5000; // Assuming $5,000 monthly income for reference
    
    if (incomeRatio < 0.1) return { message: 'Very affordable', color: 'text-green-600' };
    if (incomeRatio < 0.2) return { message: 'Affordable', color: 'text-green-500' };
    if (incomeRatio < 0.35) return { message: 'Manageable', color: 'text-yellow-600' };
    return { message: 'Consider budget impact', color: 'text-orange-600' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Loan Calculator</CardTitle>
            <CardDescription>
              Calculate your monthly payments and total loan cost for different loan types
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          updateLoanDefaults(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select loan type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loanTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <span className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                {type.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loanAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Loan Amount ($)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 25000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="loanTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Loan Term (Years)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Annual Interest Rate (%)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="e.g., 7.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quick Reference */}
                <div className="pt-4 border-t">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    Current Average Rates
                  </CardDescription>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <Badge variant="outline" className="flex flex-col items-center p-2">
                      <span>Personal</span>
                      <span className="font-semibold">8-15%</span>
                    </Badge>
                    <Badge variant="outline" className="flex flex-col items-center p-2">
                      <span>Auto</span>
                      <span className="font-semibold">5-9%</span>
                    </Badge>
                    <Badge variant="outline" className="flex flex-col items-center p-2">
                      <span>Mortgage</span>
                      <span className="font-semibold">6-8%</span>
                    </Badge>
                    <Badge variant="outline" className="flex flex-col items-center p-2">
                      <span>Student</span>
                      <span className="font-semibold">4-7%</span>
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Loan
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Payment Breakdown Visualization */}
        {result && result.monthlyPayment > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Payment Breakdown</CardTitle>
              <CardDescription>
                How your payments are allocated between principal and interest
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Principal Amount</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${form.getValues('loanAmount').toLocaleString()}
                    </p>
                  </div>
                  <BanknoteIcon className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Total Interest</p>
                    <p className="text-2xl font-bold text-orange-700">
                      ${result.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Principal vs Interest Ratio</span>
                    <span>1 : {result.interestToPrincipalRatio.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(form.getValues('loanAmount') / result.totalPayment * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Principal</span>
                    <span>Interest</span>
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
              <TabsTrigger value="types">Loan Types</TabsTrigger>
              <TabsTrigger value="tips">Money Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How are loan payments calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        Loan payments are calculated using the amortization formula, which spreads 
                        payments evenly over the loan term while accounting for interest.
                      </p>
                      <div className="bg-muted p-4 rounded-md text-center font-mono text-sm">
                        M = P [ r(1+r)^n ] / [ (1+r)^n – 1]
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Variables:</h4>
                          <ul className="space-y-1">
                            <li><b>M</b> = Monthly Payment</li>
                            <li><b>P</b> = Principal Amount</li>
                            <li><b>r</b> = Monthly Interest Rate</li>
                            <li><b>n</b> = Number of Payments</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Example:</h4>
                          <p className="text-muted-foreground">
                            $25,000 at 7.5% for 5 years:<br />
                            Monthly payment = $501.03
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="types">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      {
                        type: 'Personal Loan',
                        description: 'Unsecured loans for various purposes',
                        terms: '1-7 years',
                        rates: '6-36%',
                        bestFor: 'Debt consolidation, home improvements'
                      },
                      {
                        type: 'Auto Loan',
                        description: 'Secured loans for vehicle purchases',
                        terms: '2-7 years',
                        rates: '3-20%',
                        bestFor: 'New or used car purchases'
                      },
                      {
                        type: 'Mortgage',
                        description: 'Long-term loans for property',
                        terms: '15-30 years',
                        rates: '3-8%',
                        bestFor: 'Home purchases, refinancing'
                      },
                      {
                        type: 'Student Loan',
                        description: 'Education financing',
                        terms: '5-25 years',
                        rates: '3-15%',
                        bestFor: 'College tuition, education expenses'
                      }
                    ].map((loan, index) => (
                      <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                        <h4 className="font-semibold mb-1">{loan.type}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{loan.description}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <Badge variant="secondary">Terms: {loan.terms}</Badge>
                          <Badge variant="secondary">Rates: {loan.rates}</Badge>
                          <Badge variant="secondary">Best for: {loan.bestFor}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Smart Borrowing Tips</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="font-medium text-green-600">Before Borrowing</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Check your credit score first</li>
                          <li>Compare rates from multiple lenders</li>
                          <li>Read the fine print carefully</li>
                          <li>Consider total cost, not just monthly payment</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="font-medium text-blue-600">While Repaying</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Make extra payments when possible</li>
                          <li>Set up automatic payments</li>
                          <li>Consider bi-weekly payments</li>
                          <li>Refinance if rates drop significantly</li>
                        </ul>
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
            <CardTitle>Loan Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result && result.monthlyPayment > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                  <p className="text-5xl font-bold my-2 text-primary">
                    ${result.monthlyPayment.toFixed(2)}
                  </p>
                  {result.monthlyPayment > 0 && (
                    <Badge variant="secondary">
                      {getAffordabilityMessage(result.monthlyPayment, form.getValues('loanAmount')).message}
                    </Badge>
                  )}
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Interest</span>
                    <span className="font-semibold text-red-600">
                      ${result.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Payment</span>
                    <span className="font-semibold">
                      ${result.totalPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payoff Date</span>
                    <span className="font-semibold text-blue-600">{result.payOffDate}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Loan Term</span>
                    <span className="font-semibold">{form.getValues('loanTerm')} years</span>
                  </div>
                </div>

                {/* Quick Insight */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Key Insight</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    You'll pay ${result.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })} in interest over the life of the loan. 
                    That's {result.interestToPrincipalRatio.toFixed(2)} times the original loan amount.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your loan details to see payment summary and total cost.
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