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
import { Calculator as CalculatorIcon, Lightbulb, AlertTriangle, Info, TrendingUp, DollarSign, Calendar, Percent } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  vehiclePrice: z.coerce.number().positive('Vehicle price must be positive'),
  downPayment: z.coerce.number().min(0, 'Down payment cannot be negative').default(0),
  tradeInValue: z.coerce.number().min(0, 'Trade-in value cannot be negative').default(0),
  loanTerm: z.coerce.number().int().positive('Loan term must be a positive number of months'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  salesTaxRate: z.coerce.number().min(0, 'Sales tax rate cannot be negative').default(0),
  loanTermUnit: z.enum(['months', 'years']).default('months'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  totalLoanAmount: number;
  interestToPrincipalRatio: number;
}

export default function AutoLoanCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanTerm: 60,
      downPayment: 0,
      tradeInValue: 0,
      salesTaxRate: 0,
      loanTermUnit: 'months',
    },
  });

  const loanTermUnit = form.watch('loanTermUnit');

  const getAffordabilityLevel = (monthlyPayment: number, annualIncome?: number) => {
    if (!annualIncome) return 'unknown';
    const monthlyIncome = annualIncome / 12;
    const ratio = (monthlyPayment / monthlyIncome) * 100;
    
    if (ratio <= 10) return 'very-comfortable';
    if (ratio <= 15) return 'comfortable';
    if (ratio <= 20) return 'moderate';
    return 'stretched';
  };

  const getAffordabilityColor = (level: string) => {
    const colors = {
      'very-comfortable': 'bg-green-500',
      'comfortable': 'bg-green-400',
      'moderate': 'bg-yellow-500',
      'stretched': 'bg-orange-500',
      'unknown': 'bg-gray-500',
    };
    return colors[level as keyof typeof colors];
  };

  const getAffordabilityText = (level: string) => {
    const texts = {
      'very-comfortable': 'Very Comfortable',
      'comfortable': 'Comfortable',
      'moderate': 'Moderate',
      'stretched': 'Stretched',
      'unknown': 'Calculate with income',
    };
    return texts[level as keyof typeof texts];
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { vehiclePrice, downPayment, tradeInValue, loanTerm, interestRate, salesTaxRate, loanTermUnit } = data;
    
    const actualLoanTerm = loanTermUnit === 'years' ? loanTerm * 12 : loanTerm;
    
    const taxableAmount = vehiclePrice - tradeInValue;
    const salesTax = taxableAmount * (salesTaxRate / 100);
    const principal = vehiclePrice + salesTax - downPayment - tradeInValue;
    
    if (principal <= 0) {
      setResult({ 
        monthlyPayment: 0, 
        totalPayment: 0, 
        totalInterest: 0, 
        totalLoanAmount: 0,
        interestToPrincipalRatio: 0
      });
      return;
    }

    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = actualLoanTerm;

    const monthlyPayment = monthlyInterestRate === 0 
      ? principal / numberOfPayments
      : principal *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    const totalPayment = monthlyPayment * numberOfPayments;
    const totalInterest = totalPayment - principal;
    const interestToPrincipalRatio = (totalInterest / principal) * 100;

    setResult({ 
      monthlyPayment, 
      totalPayment, 
      totalInterest,
      totalLoanAmount: principal,
      interestToPrincipalRatio
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Auto Loan Calculator',
        monthlyPayment,
        totalInterest,
        interestRate,
        loanTerm: actualLoanTerm
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("A larger down payment can lower your monthly payments and reduce the total interest you pay over the life of the loan. Consider comparing offers from multiple lenders.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset();
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const affordabilityLevel = result ? getAffordabilityLevel(result.monthlyPayment) : 'unknown';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Auto Loan Calculator</CardTitle>
            <CardDescription>
              Calculate your monthly payments and total loan cost for your vehicle purchase
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="vehiclePrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Price ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="e.g., 35000" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="downPayment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Down Payment ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="e.g., 5000" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="tradeInValue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trade-in Value ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="e.g., 10000" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="salesTaxRate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Tax Rate (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g., 7" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="loanTermUnit" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Term Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="loanTerm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Loan Term ({loanTermUnit === 'months' ? 'Months' : 'Years'})
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder={loanTermUnit === 'months' ? 'e.g., 60' : 'e.g., 5'} 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="interestRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <TrendingUp className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="e.g., 5.5" 
                          className="pl-10"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Payment
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Payment Breakdown Visualization */}
        {result && result.totalPayment > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Breakdown</CardTitle>
              <CardDescription>
                Visualize how your payments are distributed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Principal</span>
                  <span className="font-semibold">${result.totalLoanAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Interest</span>
                  <span className="font-semibold">${result.totalInterest.toLocaleString()}</span>
                </div>
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary"
                    style={{ 
                      width: `${(result.totalLoanAmount / result.totalPayment) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Principal: {((result.totalLoanAmount / result.totalPayment) * 100).toFixed(1)}%</span>
                  <span>Interest: {((result.totalInterest / result.totalPayment) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Loan Estimate</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                  <p className="text-5xl font-bold my-2">${result.monthlyPayment.toFixed(2)}</p>
                  <Badge className={`${getAffordabilityColor(affordabilityLevel)} text-white`}>
                    {getAffordabilityText(affordabilityLevel)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Loan</p>
                    <p className="font-semibold">${result.totalLoanAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="font-semibold">${result.totalInterest.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                  </div>
                </div>

                {result.interestToPrincipalRatio > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Interest to Principal Ratio</p>
                    <p className="text-2xl font-semibold">{result.interestToPrincipalRatio.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">
                      {result.interestToPrincipalRatio < 20 ? 'Excellent' : 
                       result.interestToPrincipalRatio < 40 ? 'Good' : 
                       result.interestToPrincipalRatio < 60 ? 'Fair' : 'High'}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What this means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.interestToPrincipalRatio < 20 ? 'You have an excellent loan terms with low interest costs.' :
                     result.interestToPrincipalRatio < 40 ? 'Your loan terms are reasonable with moderate interest costs.' :
                     result.interestToPrincipalRatio < 60 ? 'Consider shopping around for better rates or increasing your down payment.' :
                     'Your interest costs are high. Explore options to reduce the loan amount or find lower rates.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your loan details to see payment estimates.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Next Step</CardTitle>
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
            <TabsTrigger value="tips">Money Saving Tips</TabsTrigger>
            <TabsTrigger value="considerations">Important Considerations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is the auto loan calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Auto loan calculations use the standard amortization formula to determine 
                      monthly payments based on principal, interest rate, and loan term.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Loan Amount Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Loan Amount = (Vehicle Price - Trade-in) × (1 + Sales Tax Rate) - Down Payment
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Monthly Payment Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          M = P × [r(1+r)^n] / [(1+r)^n – 1]
                        </div>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                          <li><b>M</b> = Monthly Payment</li>
                          <li><b>P</b> = Principal Loan Amount</li>
                          <li><b>r</b> = Monthly Interest Rate (Annual Rate ÷ 12)</li>
                          <li><b>n</b> = Number of Payments (Loan Term in Months)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="tips">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Smart Auto Loan Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      tip: "Increase Your Down Payment",
                      description: "A larger down payment reduces your loan amount and monthly payments. Aim for at least 20% of the vehicle price.",
                      impact: "High impact"
                    },
                    {
                      tip: "Shop Around for Rates",
                      description: "Compare offers from banks, credit unions, and dealerships. Even 0.5% can save you thousands.",
                      impact: "High impact"
                    },
                    {
                      tip: "Consider Shorter Loan Terms",
                      description: "Shorter terms (36-48 months) mean less interest paid overall, though monthly payments are higher.",
                      impact: "Medium impact"
                    },
                    {
                      tip: "Improve Your Credit Score",
                      description: "A higher credit score qualifies you for better interest rates. Check your score before applying.",
                      impact: "High impact"
                    },
                    {
                      tip: "Factor in Total Costs",
                      description: "Remember insurance, maintenance, fuel, and registration costs beyond the loan payment.",
                      impact: "Medium impact"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          item.impact === 'High impact' ? 'border-red-200 bg-red-50' : 
                          item.impact === 'Medium impact' ? 'border-yellow-200 bg-yellow-50' : 
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        {item.impact}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.tip}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="considerations">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Important Loan Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>Before committing to an auto loan, consider these important factors:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Total Loan Cost:</strong> Look beyond monthly payments to the total amount you'll pay including interest</li>
                    <li><strong>Prepayment Penalties:</strong> Some loans charge fees for paying off early</li>
                    <li><strong>Gap Insurance:</strong> Consider if your loan amount exceeds the vehicle's depreciated value</li>
                    <li><strong>Loan-to-Value Ratio:</strong> Lenders may require a minimum down payment to reduce their risk</li>
                    <li><strong>Dealer Financing vs. Direct Lending:</strong> Compare rates from multiple sources</li>
                    <li><strong>Variable vs. Fixed Rates:</strong> Fixed rates provide predictable payments</li>
                  </ul>
                  <p className="font-medium mt-4">
                    Always read the fine print and understand all terms before signing any loan agreement. 
                    Consider consulting with a financial advisor for major purchases.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}