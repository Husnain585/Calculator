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
import { Calculator as CalculatorIcon, Lightbulb, TrendingUp, DollarSign, Calendar, Percent, Target, PieChart, AlertTriangle, Info } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  initialInvestment: z.coerce.number().min(0, 'Initial investment cannot be negative'),
  monthlyContribution: z.coerce.number().min(0, 'Monthly contribution cannot be negative'),
  annualReturn: z.coerce.number().min(0, 'Expected return cannot be negative'),
  years: z.coerce.number().int().positive('Years must be a positive number'),
  contributionFrequency: z.enum(['monthly', 'yearly']).default('monthly'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  futureValue: number;
  totalContributions: number;
  totalInterest: number;
  growthMultiple: number;
  yearlyBreakdown: { year: number; value: number; contributions: number; interest: number }[];
}

export default function InvestmentCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      annualReturn: 7,
      contributionFrequency: 'monthly',
    }
  });

  const contributionFrequency = form.watch('contributionFrequency');

  const getGrowthLevel = (growthMultiple: number) => {
    if (growthMultiple < 2) return 'moderate';
    if (growthMultiple < 5) return 'good';
    if (growthMultiple < 10) return 'excellent';
    return 'exceptional';
  };

  const getGrowthColor = (level: string) => {
    const colors = {
      'moderate': 'bg-blue-500',
      'good': 'bg-green-500',
      'excellent': 'bg-yellow-500',
      'exceptional': 'bg-purple-500',
    };
    return colors[level as keyof typeof colors];
  };

  const getGrowthText = (level: string) => {
    const texts = {
      'moderate': 'Moderate Growth',
      'good': 'Good Growth',
      'excellent': 'Excellent Growth',
      'exceptional': 'Exceptional Growth',
    };
    return texts[level as keyof typeof texts];
  };

  const calculateYearlyBreakdown = (initial: number, monthlyContribution: number, annualReturn: number, years: number) => {
    const breakdown = [];
    let currentValue = initial;
    const monthlyRate = annualReturn / 100 / 12;
    const annualContribution = monthlyContribution * 12;

    for (let year = 1; year <= years; year++) {
      let yearlyContributions = 0;
      // Calculate month by month for accurate compounding
      for (let month = 1; month <= 12; month++) {
        currentValue += monthlyContribution;
        yearlyContributions += monthlyContribution;
        currentValue *= (1 + monthlyRate);
      }
      
      const startValue = year === 1 ? initial : breakdown[year-2].value;
      const yearlyInterest = currentValue - startValue - yearlyContributions;
      
      breakdown.push({
        year,
        value: currentValue,
        contributions: initial + (yearlyContributions * year),
        interest: currentValue - (initial + yearlyContributions * year)
      });
    }
    return breakdown;
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { initialInvestment, monthlyContribution, annualReturn, years, contributionFrequency } = data;
    
    const actualMonthlyContribution = contributionFrequency === 'yearly' ? monthlyContribution / 12 : monthlyContribution;
    
    const monthlyReturnRate = annualReturn / 100 / 12;
    const numberOfMonths = years * 12;

    const futureValueOfInitial = initialInvestment * Math.pow(1 + monthlyReturnRate, numberOfMonths);
    const futureValueOfContributions = actualMonthlyContribution * ((Math.pow(1 + monthlyReturnRate, numberOfMonths) - 1) / monthlyReturnRate);

    const futureValue = futureValueOfInitial + futureValueOfContributions;
    const totalContributions = initialInvestment + (actualMonthlyContribution * numberOfMonths);
    const totalInterest = futureValue - totalContributions;
    const growthMultiple = futureValue / totalContributions;

    const yearlyBreakdown = calculateYearlyBreakdown(initialInvestment, actualMonthlyContribution, annualReturn, years);

    setResult({ 
      futureValue, 
      totalContributions, 
      totalInterest, 
      growthMultiple,
      yearlyBreakdown 
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Investment Calculator',
        futureValue,
        totalInterest,
        growthMultiple,
        years
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("The power of compound interest grows over time. Try increasing the number of years to see the long-term impact. Consider increasing your monthly contributions for even greater growth.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      initialInvestment: undefined,
      monthlyContribution: undefined,
      years: undefined,
      annualReturn: 7,
      contributionFrequency: 'monthly',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const growthLevel = result ? getGrowthLevel(result.growthMultiple) : 'moderate';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Investment Growth Calculator</CardTitle>
            <CardDescription>
              Project your wealth growth with compound interest and regular contributions
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="initialInvestment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Investment ($)</FormLabel>
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
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contributionFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contribution Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="monthlyContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {contributionFrequency === 'monthly' ? 'Monthly Contribution ($)' : 'Yearly Contribution ($)'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder={contributionFrequency === 'monthly' ? 'e.g., 500' : 'e.g., 6000'} 
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Period (Years)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="e.g., 20" 
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
                    name="annualReturn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Annual Return (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <TrendingUp className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.1" 
                              placeholder="e.g., 7" 
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
                  Calculate Growth
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Growth Visualization */}
        {result && result.yearlyBreakdown && (
          <Card>
            <CardHeader>
              <CardTitle>Growth Over Time</CardTitle>
              <CardDescription>
                See how your investment grows year by year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.yearlyBreakdown.slice(-5).map((yearData) => (
                  <div key={yearData.year} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Year {yearData.year}</span>
                      <span className="font-semibold">${yearData.value.toLocaleString('en-US', {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ 
                          width: `${(yearData.value / result.futureValue) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground text-center">
                  Showing last 5 years of {result.yearlyBreakdown.length}-year period
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
            <CardTitle>Projected Growth</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Future Value</p>
                  <p className="text-5xl font-bold my-2">${result.futureValue.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                  <Badge className={`${getGrowthColor(growthLevel)} text-white`}>
                    {getGrowthText(growthLevel)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Invested</p>
                    <p className="font-semibold">${result.totalContributions.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="font-semibold">${result.totalInterest.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Growth Multiple</p>
                  <p className="text-2xl font-semibold">{result.growthMultiple.toFixed(2)}x</p>
                  <p className="text-sm text-muted-foreground">
                    For every $1 invested, you get ${result.growthMultiple.toFixed(2)} back
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <PieChart className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Return Composition</p>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-primary"
                      style={{ 
                        width: `${(result.totalContributions / result.futureValue) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Principal: {((result.totalContributions / result.futureValue) * 100).toFixed(1)}%</span>
                    <span>Returns: {((result.totalInterest / result.futureValue) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your investment details to see growth projections.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Investment Insight</CardTitle>
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
            <TabsTrigger value="strategies">Investment Strategies</TabsTrigger>
            <TabsTrigger value="considerations">Important Considerations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is investment growth calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Investment growth with regular contributions uses compound interest formulas 
                      to calculate the future value of both your initial lump sum and ongoing contributions.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Complete Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          FV = P × (1 + r)^n + C × [((1 + r)^n - 1) / r]
                        </div>
                        <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                          <li><b>FV</b> = Future Value of Investment</li>
                          <li><b>P</b> = Initial Investment (Principal)</li>
                          <li><b>C</b> = Regular Contribution Amount</li>
                          <li><b>r</b> = Periodic Interest Rate (annual rate ÷ 12)</li>
                          <li><b>n</b> = Total Number of Periods (years × 12)</li>
                        </ul>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Initial Investment Growth</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            FV_initial = P × (1 + r)^n
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Your starting amount compounds over time
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Contributions Growth</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            FV_contributions = C × [((1 + r)^n - 1) / r]
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Future value of a series of regular payments
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="strategies">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Smart Investment Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      strategy: "Start Early & Be Consistent",
                      description: "Time in the market beats timing the market. Regular contributions harness the power of compound interest.",
                      impact: "Critical"
                    },
                    {
                      strategy: "Increase Contributions Over Time",
                      description: "As your income grows, increase your investment contributions. Even small increases compound significantly.",
                      impact: "High impact"
                    },
                    {
                      strategy: "Diversify Your Portfolio",
                      description: "Spread investments across different asset classes to manage risk while maintaining growth potential.",
                      impact: "High impact"
                    },
                    {
                      strategy: "Reinvest Dividends",
                      description: "Automatically reinvest dividends and capital gains to accelerate compound growth.",
                      impact: "Medium impact"
                    },
                    {
                      strategy: "Tax-Advantaged Accounts",
                      description: "Utilize retirement accounts (401k, IRA) and other tax-advantaged vehicles to maximize returns.",
                      impact: "High impact"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          item.impact === 'Critical' ? 'border-red-200 bg-red-50' : 
                          item.impact === 'High impact' ? 'border-green-200 bg-green-50' : 
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        {item.impact}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.strategy}</p>
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
                  <h3 className="font-semibold">Important Investment Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>Before making investment decisions, understand these key factors:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Market Volatility:</strong> Returns are not guaranteed and can fluctuate significantly year to year</li>
                    <li><strong>Inflation:</strong> Real returns should outpace inflation to increase purchasing power</li>
                    <li><strong>Fees & Expenses:</strong> Management fees, expense ratios, and transaction costs reduce net returns</li>
                    <li><strong>Risk Tolerance:</strong> Align investments with your ability to withstand market downturns</li>
                    <li><strong>Time Horizon:</strong> Longer investment periods generally allow for more aggressive strategies</li>
                    <li><strong>Liquidity Needs:</strong> Consider when you might need access to the funds</li>
                  </ul>
                  <p className="font-medium mt-4">
                    Past performance does not guarantee future results. Consider consulting with a financial advisor 
                    for personalized investment advice tailored to your specific situation and goals.
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