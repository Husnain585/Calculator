"use client";

import { useState } from 'react';
import React from 'react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calculator as CalculatorIcon, Lightbulb, Home, DollarSign, Percent, Calendar, TrendingUp, PieChart, AlertTriangle, Info, Shield } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  homePrice: z.coerce.number().positive('Home price must be positive'),
  downPayment: z.coerce.number().min(0, 'Down payment cannot be negative'),
  downPaymentPercent: z.coerce.number().min(0).max(100, 'Down payment cannot exceed 100%'),
  loanTerm: z.coerce.number().int().positive('Loan term must be a positive number of years'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  propertyTaxRate: z.coerce.number().min(0, 'Property tax rate cannot be negative').default(1.2),
  homeownersInsurance: z.coerce.number().min(0, 'Insurance cannot be negative').default(1200),
  pmiRate: z.coerce.number().min(0, 'PMI rate cannot be negative').default(0.5),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  monthlyPrincipalAndInterest: number;
  monthlyTaxes: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  loanToValue: number;
  requiresPMI: boolean;
}

export default function MortgageCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [usePercent, setUsePercent] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loanTerm: 30,
      propertyTaxRate: 1.2,
      homeownersInsurance: 1200,
      pmiRate: 0.5,
      downPaymentPercent: 20,
    },
  });

  const homePrice = form.watch('homePrice');
  const downPayment = form.watch('downPayment');
  const downPaymentPercent = form.watch('downPaymentPercent');

  // Sync dollar and percentage inputs
  React.useEffect(() => {
    if (homePrice && homePrice > 0) {
      if (usePercent) {
        const dollarAmount = (homePrice * downPaymentPercent) / 100;
        form.setValue('downPayment', dollarAmount);
      } else {
        const percent = (downPayment / homePrice) * 100;
        form.setValue('downPaymentPercent', percent);
      }
    }
  }, [homePrice, downPayment, downPaymentPercent, usePercent, form]);

  const getAffordabilityLevel = (monthlyPayment: number, annualIncome?: number) => {
    if (!annualIncome) return 'unknown';
    const monthlyIncome = annualIncome / 12;
    const ratio = (monthlyPayment / monthlyIncome) * 100;
    
    if (ratio <= 25) return 'very-comfortable';
    if (ratio <= 30) return 'comfortable';
    if (ratio <= 35) return 'moderate';
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
    const { homePrice, downPayment, loanTerm, interestRate, propertyTaxRate, homeownersInsurance, pmiRate } = data;
    
    const principal = homePrice - downPayment;
    
    if (principal <= 0) {
      form.setError("downPayment", { message: "Down payment must be less than the home price." });
      return;
    }

    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;

    // Calculate principal and interest
    const monthlyPrincipalAndInterest =
      principal *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    // Calculate additional monthly costs
    const monthlyTaxes = (homePrice * (propertyTaxRate / 100)) / 12;
    const monthlyInsurance = homeownersInsurance / 12;
    const loanToValue = (principal / homePrice) * 100;
    const requiresPMI = loanToValue > 80;
    const monthlyPMI = requiresPMI ? (principal * (pmiRate / 100)) / 12 : 0;

    const monthlyPayment = monthlyPrincipalAndInterest + monthlyTaxes + monthlyInsurance + monthlyPMI;
    const totalPayment = monthlyPrincipalAndInterest * numberOfPayments;
    const totalInterest = totalPayment - principal;

    setResult({ 
      monthlyPayment, 
      totalPayment, 
      totalInterest,
      principal,
      monthlyPrincipalAndInterest,
      monthlyTaxes,
      monthlyInsurance,
      monthlyPMI,
      loanToValue,
      requiresPMI
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Mortgage Calculator',
        monthlyPayment,
        totalInterest,
        interestRate,
        loanTerm,
        loanToValue,
        requiresPMI
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Making extra payments can significantly reduce your total interest paid. Consider a 15-year loan or making bi-weekly payments to save on interest.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      homePrice: undefined,
      downPayment: undefined,
      downPaymentPercent: 20,
      loanTerm: 30,
      interestRate: undefined,
      propertyTaxRate: 1.2,
      homeownersInsurance: 1200,
      pmiRate: 0.5,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
    setUsePercent(false);
  };

  const affordabilityLevel = result ? getAffordabilityLevel(result.monthlyPayment) : 'unknown';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Mortgage Calculator</CardTitle>
            <CardDescription>
              Calculate your monthly mortgage payment including taxes, insurance, and PMI
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="homePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Home Price ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="e.g., 300,000" 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Down Payment</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant={!usePercent ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUsePercent(false)}
                      >
                        $
                      </Button>
                      <Button
                        type="button"
                        variant={usePercent ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUsePercent(true)}
                      >
                        %
                      </Button>
                    </div>
                  </div>
                  
                  {usePercent ? (
                    <FormField
                      control={form.control}
                      name="downPaymentPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="relative">
                                <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="number" 
                                  placeholder="e.g., 20" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                              <Slider
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                max={100}
                                step={1}
                                className="py-2"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="downPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="number" 
                                placeholder="e.g., 60,000" 
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {homePrice && downPayment && (
                    <div className="text-sm text-muted-foreground">
                      {usePercent ? (
                        <>${((homePrice * downPaymentPercent) / 100).toLocaleString()} down payment</>
                      ) : (
                        <>{(downPayment / homePrice * 100).toFixed(1)}% of home price</>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="loanTerm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Term (Years)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select loan term" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="15">15 Years</SelectItem>
                            <SelectItem value="20">20 Years</SelectItem>
                            <SelectItem value="30">30 Years</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="e.g., 6.5" 
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="propertyTaxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Tax Rate (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <TrendingUp className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="e.g., 1.2" 
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
                    name="homeownersInsurance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Homeowners Insurance ($/year)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="e.g., 1200" 
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
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Breakdown</CardTitle>
              <CardDescription>
                See how your monthly payment is distributed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  {[
                    { label: 'Principal & Interest', amount: result.monthlyPrincipalAndInterest, color: 'bg-blue-500' },
                    { label: 'Property Taxes', amount: result.monthlyTaxes, color: 'bg-green-500' },
                    { label: 'Homeowners Insurance', amount: result.monthlyInsurance, color: 'bg-yellow-500' },
                    ...(result.requiresPMI ? [{ label: 'PMI', amount: result.monthlyPMI, color: 'bg-orange-500' }] : []),
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="font-semibold">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  {[
                    { width: (result.monthlyPrincipalAndInterest / result.monthlyPayment) * 100, color: 'bg-blue-500' },
                    { width: (result.monthlyTaxes / result.monthlyPayment) * 100, color: 'bg-green-500' },
                    { width: (result.monthlyInsurance / result.monthlyPayment) * 100, color: 'bg-yellow-500' },
                    ...(result.requiresPMI ? [{ width: (result.monthlyPMI / result.monthlyPayment) * 100, color: 'bg-orange-500' }] : []),
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="h-full float-left"
                      style={{ width: `${item.width}%` }}
                    >
                      <div className={`h-full ${item.color}`} />
                    </div>
                  ))}
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
            <CardTitle>Your Estimate</CardTitle>
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
                    <p className="font-semibold">${result.principal.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="font-semibold">${result.totalInterest.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Loan-to-Value Ratio</p>
                  <p className="text-2xl font-semibold">{result.loanToValue.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">
                    {result.requiresPMI ? 'PMI Required' : 'No PMI Required'}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What this means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.loanToValue <= 80 ? 'You have a conventional loan with no PMI required.' :
                     result.loanToValue <= 90 ? 'You may need PMI. Consider a larger down payment to avoid this cost.' :
                     'You have a high LTV ratio. PMI will be required until you reach 20% equity.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your mortgage details to see payment estimates.
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
            <TabsTrigger value="terminology">Mortgage Terms</TabsTrigger>
            <TabsTrigger value="considerations">Important Considerations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is the mortgage payment calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Mortgage payments typically include four components known as PITI: 
                      Principal, Interest, Taxes, and Insurance. PMI may be added if your down payment is less than 20%.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Principal & Interest Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          M = P × [r(1+r)^n] ÷ [(1+r)^n – 1]
                        </div>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                          <li><b>M</b> = Monthly Principal & Interest Payment</li>
                          <li><b>P</b> = Principal Loan Amount (Home Price - Down Payment)</li>
                          <li><b>r</b> = Monthly Interest Rate (Annual Rate ÷ 12)</li>
                          <li><b>n</b> = Number of Payments (Loan Term in Years × 12)</li>
                        </ul>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Additional Monthly Costs</h4>
                          <div className="space-y-2 text-sm">
                            <p><b>Property Taxes:</b> (Home Price × Tax Rate) ÷ 12</p>
                            <p><b>Home Insurance:</b> Annual Premium ÷ 12</p>
                            <p><b>PMI:</b> (Loan Amount × PMI Rate) ÷ 12 (if LTV {'>'} 80%)</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Total Monthly Payment</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Total = Principal & Interest + Taxes + Insurance + PMI
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="terminology">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Key Mortgage Terms</h3>
                <div className="space-y-4">
                  {[
                    {
                      term: "PITI",
                      definition: "Principal, Interest, Taxes, and Insurance - the four components of a typical mortgage payment",
                      importance: "Critical"
                    },
                    {
                      term: "PMI (Private Mortgage Insurance)",
                      definition: "Insurance that protects the lender if you default. Required when down payment is less than 20%",
                      importance: "High impact"
                    },
                    {
                      term: "LTV (Loan-to-Value Ratio)",
                      definition: "The loan amount divided by the home value. Lower LTV means less risk for the lender",
                      importance: "High impact"
                    },
                    {
                      term: "Amortization",
                      definition: "The process of paying off a loan through regular payments over time",
                      importance: "Medium impact"
                    },
                    {
                      term: "Escrow",
                      definition: "An account held by the lender to pay property taxes and insurance on your behalf",
                      importance: "Medium impact"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          item.importance === 'Critical' ? 'border-red-200 bg-red-50' : 
                          item.importance === 'High impact' ? 'border-green-200 bg-green-50' : 
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        {item.importance}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.term}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.definition}</p>
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
                  <h3 className="font-semibold">Important Mortgage Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>Before committing to a mortgage, consider these important factors:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Total Homeownership Costs:</strong> Budget for maintenance, repairs, utilities, and HOA fees beyond the mortgage payment</li>
                    <li><strong>Interest Rate Type:</strong> Fixed rates provide predictability; adjustable rates may start lower but can increase</li>
                    <li><strong>Closing Costs:</strong> Typically 2-5% of the home price, paid at settlement</li>
                    <li><strong>Prepayment Penalties:</strong> Some loans charge fees for paying off early or making extra payments</li>
                    <li><strong>Debt-to-Income Ratio:</strong> Lenders generally prefer a DTI of 43% or less including the new mortgage</li>
                    <li><strong>Future Plans:</strong> Consider how long you plan to stay in the home when choosing loan terms</li>
                  </ul>
                  <p className="font-medium mt-4">
                    Get pre-approved before house hunting and compare loan estimates from multiple lenders. 
                    Consider consulting with a mortgage professional for personalized advice.
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