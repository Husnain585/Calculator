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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calculator as CalculatorIcon, Lightbulb, Calendar, DollarSign, Percent, TrendingUp, Target, Clock, PiggyBank } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  currentAge: z.coerce.number().int().min(18, 'Current age must be at least 18').max(80, 'Current age is too high'),
  retirementAge: z.coerce.number().int().min(25, 'Retirement age must be at least 25').max(100, 'Retirement age is too high'),
  currentSavings: z.coerce.number().min(0, 'Current savings cannot be negative').max(100000000, 'Current savings is too large'),
  monthlyContribution: z.coerce.number().min(0, 'Monthly contribution cannot be negative').max(100000, 'Monthly contribution is too large'),
  annualReturn: z.coerce.number().min(0.1, 'Expected return must be at least 0.1%').max(50, 'Expected return is too high'),
  retirementIncome: z.coerce.number().min(0, 'Desired income cannot be negative').optional(),
}).refine(data => data.retirementAge > data.currentAge, {
  message: "Retirement age must be greater than current age.",
  path: ["retirementAge"],
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  retirementSavings: number;
  totalContributions: number;
  interestEarned: number;
  yearsToRetirement: number;
  monthlyRetirementIncome: number;
  savingsGap: number;
}

export default function RetirementCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      annualReturn: 7,
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 0,
      monthlyContribution: 500,
      retirementIncome: 5000,
    }
  });

  const calculateRetirement = (data: FormValues) => {
    const { currentAge, retirementAge, currentSavings, monthlyContribution, annualReturn, retirementIncome = 5000 } = data;
    const yearsToGrow = retirementAge - currentAge;
    const monthlyReturnRate = annualReturn / 100 / 12;
    const numberOfMonths = yearsToGrow * 12;

    // Future value of current savings
    const futureValueOfCurrentSavings = currentSavings * Math.pow(1 + monthlyReturnRate, numberOfMonths);
    
    // Future value of monthly contributions (annuity)
    const futureValueOfContributions = monthlyContribution * 
      ((Math.pow(1 + monthlyReturnRate, numberOfMonths) - 1) / monthlyReturnRate) * 
      (1 + monthlyReturnRate);

    const retirementSavings = futureValueOfCurrentSavings + futureValueOfContributions;
    const totalContributions = currentSavings + (monthlyContribution * numberOfMonths);
    const interestEarned = retirementSavings - totalContributions;

    // Calculate sustainable monthly withdrawal (4% rule)
    const monthlyRetirementIncome = retirementSavings * 0.04 / 12;
    const savingsGap = (retirementIncome * 12 / 0.04) - retirementSavings;

    return { 
      retirementSavings,
      totalContributions,
      interestEarned,
      yearsToRetirement: yearsToGrow,
      monthlyRetirementIncome,
      savingsGap
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateRetirement(data);
    setResult(result);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Retirement Calculator',
        currentAge: data.currentAge,
        retirementAge: data.retirementAge,
        currentSavings: data.currentSavings,
        monthlyContribution: data.monthlyContribution,
        annualReturn: data.annualReturn,
        retirementSavings: result.retirementSavings,
        savingsGap: result.savingsGap
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consider increasing your monthly contributions by 1% each year. This 'save more tomorrow' approach can significantly boost your retirement savings without impacting your current lifestyle.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 0,
      monthlyContribution: 500,
      annualReturn: 7,
      retirementIncome: 5000,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const getRetirementReadiness = (gap: number) => {
    if (gap <= 0) return { status: 'On Track', color: 'text-green-600', bg: 'bg-green-100' };
    if (gap < 100000) return { status: 'Almost There', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (gap < 500000) return { status: 'Needs Work', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { status: 'Significant Gap', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const investmentOptions = [
    { type: 'Conservative', return: 4, risk: 'Low', description: 'Bonds, CDs' },
    { type: 'Moderate', return: 7, risk: 'Medium', description: '60% Stocks, 40% Bonds' },
    { type: 'Aggressive', return: 10, risk: 'High', description: '90% Stocks, 10% Bonds' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Retirement Calculator</CardTitle>
            <CardDescription>
              Plan your financial future and see if you're on track for retirement
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="currentAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Current Age
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="retirementAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Retirement Age
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 65" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="currentSavings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4" />
                          Current Savings ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyContribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Monthly Contribution ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="annualReturn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Expected Annual Return (%)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 7" {...field} />
                      </FormControl>
                      <FormDescription>
                        Historical averages: Conservative (3-5%), Moderate (6-8%), Aggressive (9-11%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retirementIncome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Desired Monthly Retirement Income ($)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5000" {...field} />
                      </FormControl>
                      <FormDescription>
                        Based on 80% of pre-retirement income (4% safe withdrawal rate)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Investment Strategy Reference */}
                <div className="pt-4 border-t">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4" />
                    Common Investment Strategies
                  </CardDescription>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {investmentOptions.map((option, index) => (
                      <Badge key={index} variant="outline" className="flex flex-col items-center p-2">
                        <span className="font-semibold">{option.type}</span>
                        <span>{option.return}% avg return</span>
                        <span className="text-muted-foreground">{option.risk} risk</span>
                      </Badge>
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
                  Calculate Retirement
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Savings Breakdown Visualization */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Savings Breakdown</CardTitle>
              <CardDescription>
                How your retirement savings accumulate over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Your Contributions</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${result.totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <PiggyBank className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Investment Growth</p>
                    <p className="text-2xl font-bold text-green-700">
                      ${result.interestEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Contributions vs Growth</span>
                    <span>{((result.totalContributions / result.retirementSavings) * 100).toFixed(1)}% Contributions</span>
                  </div>
                  <Progress value={(result.totalContributions / result.retirementSavings) * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Your Money</span>
                    <span>Investment Growth</span>
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
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How are retirement savings calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        Retirement savings grow through compound interest on both your initial savings and regular contributions.
                      </p>
                      <div className="bg-muted p-4 rounded-md text-center font-mono text-sm">
                        FV = P(1+r)^n + C[((1+r)^n - 1)/r]
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Variables:</h4>
                          <ul className="space-y-1">
                            <li><b>FV</b> = Future Value</li>
                            <li><b>P</b> = Current Savings</li>
                            <li><b>C</b> = Monthly Contribution</li>
                            <li><b>r</b> = Monthly Return Rate</li>
                            <li><b>n</b> = Number of Months</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">The Power of Time:</h4>
                          <p className="text-muted-foreground">
                            Starting 10 years earlier can more than double your retirement savings due to compound growth.
                          </p>
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
                  <div className="space-y-4">
                    <h4 className="font-semibold">Retirement Saving Strategies</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="font-medium text-green-600">Acceleration Tips</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Maximize employer 401(k) matching</li>
                          <li>Increase contributions with each raise</li>
                          <li>Consider Roth IRA for tax-free growth</li>
                          <li>Automate your savings</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="font-medium text-blue-600">Common Mistakes</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Starting too late</li>
                          <li>Being too conservative with investments</li>
                          <li>Not accounting for inflation</li>
                          <li>Underestimating healthcare costs</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdrawal">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">The 4% Rule</h4>
                    <p className="text-sm text-muted-foreground">
                      The 4% rule suggests you can safely withdraw 4% of your retirement savings annually 
                      without running out of money over a 30-year retirement.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <strong>Example:</strong> With $1,000,000 in savings, you could withdraw $40,000 per year 
                        ($3,333 per month) adjusted for inflation each year.
                      </p>
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
            <CardTitle>Retirement Outlook</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Retirement Savings</p>
                  <p className="text-4xl font-bold text-primary my-2">
                    ${result.retirementSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <Badge variant="secondary">
                    {result.yearsToRetirement} years to retirement
                  </Badge>
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sustainable Monthly Income</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${result.monthlyRetirementIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-muted-foreground">(4% safe withdrawal rate)</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Your Contributions</span>
                    <span className="font-semibold">
                      ${result.totalContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Investment Growth</span>
                    <span className="font-semibold text-green-600">
                      ${result.interestEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {result.savingsGap > 0 && (
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <p className="text-sm font-medium text-orange-800">Savings Gap</p>
                      <p className="text-lg font-bold text-orange-700">
                        ${result.savingsGap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Retirement Readiness */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Retirement Readiness</p>
                  </div>
                  <Badge className={getRetirementReadiness(result.savingsGap).bg + ' ' + getRetirementReadiness(result.savingsGap).color}>
                    {getRetirementReadiness(result.savingsGap).status}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2 text-left">
                    {result.savingsGap <= 0 
                      ? "You're on track to meet your retirement income goal!"
                      : `You need $${result.savingsGap.toLocaleString(undefined, { maximumFractionDigits: 0 })} more to reach your desired retirement income.`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your retirement details to see your financial outlook.
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