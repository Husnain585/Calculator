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
import { Slider } from '@/components/ui/slider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Calculator as CalculatorIcon, Lightbulb, DollarSign, Calendar, Percent, Home, Car, GraduationCap, Sparkles, Copy, History, Info, Target } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  loanAmount: z.coerce.number().positive('Loan amount must be positive'),
  loanTerm: z.coerce.number().int().positive('Loan term must be a positive number of years'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
});

type FormValues = z.infer<typeof formSchema>;

interface AmortizationEntry {
  month: number;
  year: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
}

interface CalculationHistory {
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  monthlyPayment: number;
  totalInterest: number;
  timestamp: Date;
}

const chartConfig = {
  balance: {
    label: 'Remaining Balance',
    color: 'hsl(var(--primary))',
  },
  interest: {
    label: 'Interest Paid',
    color: 'hsl(var(--destructive))',
  },
  principal: {
    label: 'Principal Paid',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function AmortizationCalculator() {
  const [schedule, setSchedule] = useState<AmortizationEntry[]>([]);
  const [summary, setSummary] = useState<{ 
    monthlyPayment: number, 
    totalInterest: number, 
    totalPayment: number,
    payOffDate: string 
  } | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { loanTerm: 30 },
  });

  const loanAmount = form.watch('loanAmount');
  const interestRate = form.watch('interestRate');
  const loanTerm = form.watch('loanTerm');

  const getLoanPresets = () => [
    { type: 'mortgage', amount: 300000, term: 30, rate: 6.5, label: 'Home Loan', icon: <Home className="h-4 w-4" /> },
    { type: 'auto', amount: 35000, term: 5, rate: 5.5, label: 'Auto Loan', icon: <Car className="h-4 w-4" /> },
    { type: 'personal', amount: 15000, term: 3, rate: 8.0, label: 'Personal Loan', icon: <DollarSign className="h-4 w-4" /> },
    { type: 'student', amount: 50000, term: 10, rate: 4.5, label: 'Student Loan', icon: <GraduationCap className="h-4 w-4" /> },
  ];

  const getCommonRates = () => [
    { rate: 3.5, label: '3.5%', era: 'Historic Low' },
    { rate: 5.0, label: '5.0%', era: 'Good' },
    { rate: 6.5, label: '6.5%', era: 'Average' },
    { rate: 8.0, label: '8.0%', era: 'High' },
  ];

  const calculateAmortization = (data: FormValues) => {
    const principal = data.loanAmount;
    const monthlyInterestRate = data.interestRate / 100 / 12;
    const numberOfPayments = data.loanTerm * 12;

    const monthlyPayment =
      principal *
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
    
    if (!isFinite(monthlyPayment)) {
      form.setError("interestRate", { message: "Cannot calculate with this rate." });
      return { schedule: [], summary: null };
    }

    const newSchedule: AmortizationEntry[] = [];
    let balance = principal;
    let totalInterest = 0;
    let cumulativeInterest = 0;

    for (let i = 1; i <= numberOfPayments; i++) {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance -= principalPayment;
      cumulativeInterest += interestPayment;
      totalInterest += interestPayment;

      newSchedule.push({
        month: i,
        year: Math.ceil(i / 12),
        interest: interestPayment,
        principal: principalPayment,
        balance: balance > 0 ? balance : 0,
        cumulativeInterest
      });
    }

    // Calculate pay-off date
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + numberOfPayments);
    const payOffDate = startDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });

    return {
      schedule: newSchedule,
      summary: {
        monthlyPayment,
        totalInterest,
        totalPayment: monthlyPayment * numberOfPayments,
        payOffDate
      }
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateAmortization(data);
    setSchedule(result.schedule);
    setSummary(result.summary);

    // Add to history
    if (result.summary) {
      setHistory(prev => [{
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        loanTerm: data.loanTerm,
        monthlyPayment: result.summary.monthlyPayment,
        totalInterest: result.summary.totalInterest,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]);
    }

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Amortization Calculator',
        loanAmount: data.loanAmount,
        interestRate: data.interestRate,
        loanTerm: data.loanTerm
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consider making bi-weekly payments instead of monthly to pay off your loan faster and save thousands in interest.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({ loanAmount: undefined, interestRate: undefined, loanTerm: 30 });
    setSchedule([]);
    setSummary(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const applyLoanPreset = (preset: any) => {
    form.setValue('loanAmount', preset.amount);
    form.setValue('loanTerm', preset.term);
    form.setValue('interestRate', preset.rate);
  };

  const applyCommonRate = (rate: number) => {
    form.setValue('interestRate', rate);
  };

  const copyToClipboard = () => {
    if (!summary) return;
    const text = `Monthly Payment: $${summary.monthlyPayment.toFixed(2)} | Total Interest: $${summary.totalInterest.toLocaleString()} | Payoff: ${summary.payOffDate}`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Loan summary copied to clipboard.',
      duration: 2000,
    });
  };

  const recalculate = () => {
    const currentValues = form.getValues();
    if (currentValues.loanAmount && currentValues.interestRate) {
      onSubmit(currentValues);
    }
  };

  // Prepare data for charts
  const yearlyData = schedule.reduce((acc, entry) => {
    const year = entry.year;
    if (!acc[year]) {
      acc[year] = { principal: 0, interest: 0, balance: entry.balance };
    }
    acc[year].principal += entry.principal;
    acc[year].interest += entry.interest;
    return acc;
  }, {} as Record<number, { principal: number; interest: number; balance: number }>);

  const chartData = Object.entries(yearlyData).map(([year, data]) => ({
    year: `Year ${year}`,
    principal: data.principal,
    interest: data.interest,
    balance: data.balance
  }));

  const paymentBreakdown = summary ? [
    { name: 'Principal', value: form.getValues('loanAmount') },
    { name: 'Interest', value: summary.totalInterest }
  ] : [];

  const interestToPrincipalRatio = summary ? summary.totalInterest / form.getValues('loanAmount') : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Amortization Calculator</CardTitle>
            <CardDescription>
              Calculate your loan payment schedule and see how payments are applied over time
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Loan Presets */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Common Loan Types
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {getLoanPresets().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyLoanPreset(preset)}
                      >
                        <div className="flex items-center gap-1">
                          {preset.icon}
                          <span>{preset.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Interest Rate Presets */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Common Interest Rates
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {getCommonRates().map((rate, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyCommonRate(rate.rate)}
                      >
                        <div className="flex flex-col">
                          <span>{rate.label}</span>
                          <span className="text-xs text-muted-foreground">{rate.era}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Loan Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="loanAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        Loan Amount ($)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 300000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="loanTerm" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Loan Term (Years)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input type="number" placeholder="e.g., 30" {...field} />
                          <Slider
                            min={1}
                            max={30}
                            step={1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="interestRate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        Interest Rate (%)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input type="number" step="0.01" placeholder="e.g., 6.5" {...field} />
                          <Slider
                            min={0}
                            max={15}
                            step={0.1}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Quick Preview */}
                {loanAmount && loanAmount > 0 && interestRate > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Estimated Monthly Payment:</span>
                      <span className="font-semibold">
                        ${(calculateAmortization({ loanAmount, interestRate, loanTerm }).summary?.monthlyPayment || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Interest (Estimate):</span>
                      <span className="font-semibold text-red-600">
                        ${(calculateAmortization({ loanAmount, interestRate, loanTerm }).summary?.totalInterest || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit" className="flex-1" disabled={!loanAmount || loanAmount <= 0}>
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Amortization
                </Button>
                {summary && (
                  <Button type="button" variant="outline" onClick={recalculate}>
                    <CalculatorIcon className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Recent loan calculations (last 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">${item.loanAmount.toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.interestRate}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">${item.monthlyPayment.toFixed(2)}/mo</div>
                      <div className="text-xs text-muted-foreground">
                        ${item.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })} interest
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {schedule.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Payment Breakdown</CardTitle>
                <CardDescription>
                  Visual representation of your principal vs interest payments over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ChartContainer config={chartConfig}>
                    <BarChart data={chartData.slice(0, 10)}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="year" />
                      <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="principal" fill="var(--color-principal)" />
                      <Bar dataKey="interest" fill="var(--color-interest)" />
                    </BarChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Amortization Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="yearly" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="yearly">Yearly View</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly View</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="yearly">
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Year</TableHead>
                            <TableHead className="text-right">Principal Paid</TableHead>
                            <TableHead className="text-right">Interest Paid</TableHead>
                            <TableHead className="text-right">Remaining Balance</TableHead>
                            <TableHead className="text-right">Cumulative Interest</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.map((data, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{data.year}</TableCell>
                              <TableCell className="text-right">${data.principal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">${data.interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">${data.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-right">
                                ${schedule.find(entry => entry.year === index + 1)?.cumulativeInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="monthly">
                    <div className="max-h-96 overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background">
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Principal</TableHead>
                            <TableHead className="text-right">Interest</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedule.slice(0, 120).map((entry) => (
                            <TableRow key={entry.month}>
                              <TableCell className="font-medium">{entry.month}</TableCell>
                              <TableCell className="text-right">${entry.principal.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${entry.interest.toFixed(2)}</TableCell>
                              <TableCell className="text-right">${entry.balance.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Loan Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {summary ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Monthly Payment</p>
                  <p className="text-3xl font-bold text-primary my-2">${summary.monthlyPayment.toFixed(2)}</p>
                </div>
                
                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Interest</span>
                    <span className="font-semibold text-red-600">
                      ${summary.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Payment</span>
                    <span className="font-semibold">
                      ${summary.totalPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payoff Date</span>
                    <span className="font-semibold text-blue-600">{summary.payOffDate}</span>
                  </div>
                </div>

                {/* Payment Breakdown Pie Chart */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Payment Breakdown</p>
                  <div className="h-32">
                    <ChartContainer config={chartConfig}>
                      <PieChart>
                        <Pie
                          data={paymentBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {paymentBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-xs mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#0088FE] rounded"></div>
                      <span>Principal</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-[#00C49F] rounded"></div>
                      <span>Interest</span>
                    </div>
                  </div>
                </div>

                {/* Loan Balance Chart */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Loan Balance Over Time</p>
                  <div className="h-32">
                    <ChartContainer config={chartConfig}>
                      <AreaChart 
                        data={schedule.filter((_, i) => i % 12 === 0)} 
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                      >
                        <Area 
                          dataKey="balance" 
                          fill="var(--color-balance)" 
                          fillOpacity={0.4} 
                          stroke="var(--color-balance)" 
                        />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Key Insights</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-left space-y-1">
                    <p>• Interest to Principal Ratio: {interestToPrincipalRatio.toFixed(2)}:1</p>
                    <p>• First Payment: {schedule[0]?.interest.toFixed(2)} interest</p>
                    <p>• Last Payment: {schedule[schedule.length - 1]?.interest.toFixed(2)} interest</p>
                    <p>• Years to 50% Equity: {schedule.findIndex(entry => entry.balance <= form.getValues('loanAmount') / 2) / 12} years</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyToClipboard}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Summary
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your loan details to see payment summary and amortization schedule.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Tip</CardTitle>
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
        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide">Usage Guide</TabsTrigger>
            <TabsTrigger value="strategies">Payment Strategies</TabsTrigger>
            <TabsTrigger value="formulas">Calculation Methods</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guide">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How are the payments calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      The monthly payment is calculated using the standard formula for an amortizing loan:
                    </p>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Amortization Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          M = P [ r(1+r)^n ] / [ (1+r)^n – 1]
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          This ensures equal monthly payments throughout the loan term
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Variable Definitions</h4>
                          <div className="text-sm space-y-2">
                            <p><strong>M</strong> = Monthly Payment</p>
                            <p><strong>P</strong> = Principal Loan Amount</p>
                            <p><strong>r</strong> = Monthly Interest Rate</p>
                            <p><strong>n</strong> = Number of Payments</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Key Characteristics</h4>
                          <div className="text-sm space-y-2">
                            <p>• Early payments are mostly interest</p>
                            <p>• Later payments are mostly principal</p>
                            <p>• Total interest decreases with shorter terms</p>
                            <p>• Extra payments save significant interest</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="amortization">
                <AccordionTrigger>What is loan amortization?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Amortization is the process of paying off a debt over time through regular payments. 
                      Each payment covers both interest charges and principal reduction.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">The Amortization Process</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>Month 1:</strong> 80% interest, 20% principal (example)</p>
                          <p><strong>Year 10:</strong> 50% interest, 50% principal (example)</p>
                          <p><strong>Final Year:</strong> 10% interest, 90% principal (example)</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Benefits of Understanding</h4>
                          <div className="text-sm space-y-2">
                            <p>• See exactly where your money goes</p>
                            <p>• Plan extra payments strategically</p>
                            <p>• Understand interest savings</p>
                            <p>• Make informed refinancing decisions</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Common Loan Types</h4>
                          <div className="text-sm space-y-2">
                            <p><strong>Fixed Rate:</strong> Consistent payments</p>
                            <p><strong>Adjustable Rate:</strong> Payments can change</p>
                            <p><strong>Interest-Only:</strong> Principal paid later</p>
                            <p><strong>Balloon:</strong> Large final payment</p>
                          </div>
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
                <h3 className="font-semibold mb-4">Smart Payment Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      strategy: "Bi-weekly Payments",
                      savings: "Save 10-15% in interest",
                      description: "Make half-payments every two weeks instead of monthly",
                      details: "Results in 13 full payments per year instead of 12"
                    },
                    {
                      strategy: "Extra Principal Payments",
                      savings: "Save thousands in interest",
                      description: "Add extra money to principal each month",
                      details: "Even $50-100 extra can cut years off your loan"
                    },
                    {
                      strategy: "Refinance at Lower Rate",
                      savings: "Reduce monthly payments",
                      description: "Replace existing loan with lower interest rate",
                      details: "Best when rates drop 1% or more below current rate"
                    },
                    {
                      strategy: "Shorter Loan Term",
                      savings: "Save 30-50% in interest",
                      description: "Choose 15-year instead of 30-year mortgage",
                      details: "Higher payments but massive interest savings"
                    },
                    {
                      strategy: "Lump Sum Payments",
                      savings: "Immediate principal reduction",
                      description: "Apply bonuses, tax refunds to principal",
                      details: "Most effective early in loan term"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-blue-200 bg-blue-50">
                        {item.strategy}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.savings}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formulas">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalculatorIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold">Calculation Methods & Formulas</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Monthly Payment Calculation</h4>
                    <div className="font-mono bg-muted p-3 rounded-md text-xs mb-2">
                      M = P × [r(1+r)^n] / [(1+r)^n - 1]
                    </div>
                    <p className="text-muted-foreground">
                      This standard formula ensures equal payments throughout the loan term while 
                      properly allocating amounts between principal and interest.
                    </p>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Interest Calculation</h4>
                    <div className="font-mono bg-muted p-3 rounded-md text-xs mb-2">
                      Monthly Interest = Remaining Balance × (Annual Rate ÷ 12)
                    </div>
                    <p className="text-muted-foreground">
                      Interest is calculated monthly on the remaining balance, which is why 
                      early payments contain more interest and later payments contain more principal.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold">Pro Tips</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>• <strong>1% rate reduction</strong> can save ~10% in total interest</p>
                      <p>• <strong>5-year shorter term</strong> can save ~25% in total interest</p>
                      <p>• <strong>Extra $100/month</strong> can reduce 30-year loan to ~22 years</p>
                      <p>• <strong>Bi-weekly payments</strong> can save 4-5 years of payments</p>
                    </div>
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