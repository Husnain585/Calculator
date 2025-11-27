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
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Calculator as CalculatorIcon, Lightbulb, DollarSign, Percent, Calendar, CreditCard, Wallet, Sparkles, Copy, History, Info, TrendingDown, AlertTriangle } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const debtSchema = z.object({
  balance: z.coerce.number().positive('Balance must be positive'),
  interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
  monthlyPayment: z.coerce.number().positive('Monthly payment must be positive'),
});

const formSchema = z.object({
  currentDebts: z.array(debtSchema).min(1, 'At least one debt is required'),
  consolidationLoan: z.object({
    amount: z.coerce.number().positive('Loan amount must be positive'),
    interestRate: z.coerce.number().min(0, 'Interest rate cannot be negative'),
    term: z.coerce.number().int().positive('Loan term must be positive'),
  }),
});

type FormValues = z.infer<typeof formSchema>;
type Debt = z.infer<typeof debtSchema>;

interface DebtResult {
  current: {
    totalMonthlyPayment: number;
    totalInterest: number;
    totalCost: number;
    payoffTime: number;
    savings: number;
  };
  consolidated: {
    monthlyPayment: number;
    totalInterest: number;
    totalCost: number;
    payoffTime: number;
    savings: number;
  };
  comparison: {
    monthlySavings: number;
    totalSavings: number;
    timeSavings: number;
    interestSavings: number;
  };
}

interface CalculationHistory {
  currentDebts: Debt[];
  consolidationLoan: FormValues['consolidationLoan'];
  savings: number;
  timestamp: Date;
}

const chartConfig = {
  current: {
    label: 'Current Payments',
    color: 'hsl(var(--destructive))',
  },
  consolidated: {
    label: 'Consolidated Payment',
    color: 'hsl(var(--primary))',
  },
  interest: {
    label: 'Interest',
    color: 'hsl(var(--chart-3))',
  },
  principal: {
    label: 'Principal',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function DebtConsolidationCalculator() {
  const [result, setResult] = useState<DebtResult | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentDebts: [
        { balance: 5000, interestRate: 18.9, monthlyPayment: 150 },
        { balance: 3000, interestRate: 22.9, monthlyPayment: 100 },
        { balance: 2000, interestRate: 15.9, monthlyPayment: 75 },
      ],
      consolidationLoan: {
        amount: 10000,
        interestRate: 12.5,
        term: 36,
      },
    },
  });

  const currentDebts = form.watch('currentDebts');
  const consolidationLoan = form.watch('consolidationLoan');

  const getDebtPresets = () => [
    {
      name: 'Credit Card Debt',
      debts: [
        { balance: 8000, interestRate: 19.9, monthlyPayment: 240 },
        { balance: 4000, interestRate: 22.9, monthlyPayment: 120 },
      ],
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      name: 'Personal Loans',
      debts: [
        { balance: 10000, interestRate: 14.9, monthlyPayment: 300 },
        { balance: 5000, interestRate: 11.9, monthlyPayment: 180 },
      ],
      icon: <Wallet className="h-4 w-4" />
    },
    {
      name: 'Mixed Debt',
      debts: [
        { balance: 6000, interestRate: 18.9, monthlyPayment: 200 },
        { balance: 7000, interestRate: 9.9, monthlyPayment: 220 },
        { balance: 3000, interestRate: 15.9, monthlyPayment: 100 },
      ],
      icon: <DollarSign className="h-4 w-4" />
    },
  ];

  const getConsolidationPresets = () => [
    { rate: 7.9, term: 36, label: 'Excellent Credit', badge: 'Best' },
    { rate: 12.5, term: 48, label: 'Good Credit', badge: 'Good' },
    { rate: 18.9, term: 60, label: 'Fair Credit', badge: 'Fair' },
    { rate: 24.9, term: 72, label: 'Poor Credit', badge: 'High' },
  ];

  const calculateDebtPayoff = (debts: Debt[]) => {
    let totalMonthlyPayment = 0;
    let totalInterest = 0;
    let totalCost = 0;
    let maxPayoffTime = 0;

    debts.forEach(debt => {
      totalMonthlyPayment += debt.monthlyPayment;
      
      let balance = debt.balance;
      let months = 0;
      let interestPaid = 0;
      
      while (balance > 0 && months < 600) { // Cap at 50 years
        const monthlyInterest = balance * (debt.interestRate / 100 / 12);
        const principalPayment = Math.min(debt.monthlyPayment - monthlyInterest, balance);
        
        interestPaid += monthlyInterest;
        balance -= principalPayment;
        months++;
        
        if (balance <= 0) break;
      }
      
      totalInterest += interestPaid;
      totalCost += debt.balance + interestPaid;
      maxPayoffTime = Math.max(maxPayoffTime, months);
    });

    return {
      totalMonthlyPayment,
      totalInterest,
      totalCost,
      payoffTime: Math.ceil(maxPayoffTime / 12),
      savings: 0 // Will be calculated in comparison
    };
  };

  const calculateConsolidatedLoan = (loan: FormValues['consolidationLoan']) => {
    const principal = loan.amount;
    const monthlyRate = loan.interestRate / 100 / 12;
    const numberOfPayments = loan.term;

    const monthlyPayment =
      principal *
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const totalInterest = monthlyPayment * numberOfPayments - principal;
    const totalCost = principal + totalInterest;

    return {
      monthlyPayment: isFinite(monthlyPayment) ? monthlyPayment : 0,
      totalInterest,
      totalCost,
      payoffTime: loan.term / 12,
      savings: 0
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const currentResult = calculateDebtPayoff(data.currentDebts);
    const consolidatedResult = calculateConsolidatedLoan(data.consolidationLoan);

    const totalCurrentCost = currentResult.totalCost;
    const totalConsolidatedCost = consolidatedResult.totalCost;

    const comparison = {
      monthlySavings: currentResult.totalMonthlyPayment - consolidatedResult.monthlyPayment,
      totalSavings: totalCurrentCost - totalConsolidatedCost,
      timeSavings: currentResult.payoffTime - consolidatedResult.payoffTime,
      interestSavings: currentResult.totalInterest - consolidatedResult.totalInterest,
    };

    const result: DebtResult = {
      current: { ...currentResult, savings: comparison.totalSavings },
      consolidated: { ...consolidatedResult, savings: comparison.totalSavings },
      comparison
    };

    setResult(result);

    // Add to history
    setHistory(prev => [{
      currentDebts: data.currentDebts,
      consolidationLoan: data.consolidationLoan,
      savings: comparison.totalSavings,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Debt Consolidation Calculator',
        currentDebts: data.currentDebts,
        consolidationLoan: data.consolidationLoan,
        savings: comparison.totalSavings
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Debt consolidation works best when you can secure a lower interest rate than your current debts. Consider improving your credit score before applying for consolidation loans.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      currentDebts: [
        { balance: 5000, interestRate: 18.9, monthlyPayment: 150 },
        { balance: 3000, interestRate: 22.9, monthlyPayment: 100 },
        { balance: 2000, interestRate: 15.9, monthlyPayment: 75 },
      ],
      consolidationLoan: {
        amount: 10000,
        interestRate: 12.5,
        term: 36,
      },
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const addDebt = () => {
    const currentDebts = form.getValues('currentDebts');
    form.setValue('currentDebts', [
      ...currentDebts,
      { balance: 1000, interestRate: 15.9, monthlyPayment: 50 }
    ]);
  };

  const removeDebt = (index: number) => {
    const currentDebts = form.getValues('currentDebts');
    if (currentDebts.length > 1) {
      form.setValue('currentDebts', currentDebts.filter((_, i) => i !== index));
    }
  };

  const applyDebtPreset = (preset: any) => {
    form.setValue('currentDebts', preset.debts);
    const totalBalance = preset.debts.reduce((sum: number, debt: Debt) => sum + debt.balance, 0);
    form.setValue('consolidationLoan.amount', totalBalance);
  };

  const applyConsolidationPreset = (preset: any) => {
    form.setValue('consolidationLoan.interestRate', preset.rate);
    form.setValue('consolidationLoan.term', preset.term);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Debt Consolidation Savings: $${result.comparison.totalSavings.toFixed(2)} | Monthly Savings: $${result.comparison.monthlySavings.toFixed(2)} | Time Saved: ${result.comparison.timeSavings} years`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Consolidation summary copied to clipboard.',
      duration: 2000,
    });
  };

  const recalculate = () => {
    const currentValues = form.getValues();
    onSubmit(currentValues);
  };

  // Chart data preparation
  const debtBreakdownData = currentDebts.map((debt, index) => ({
    name: `Debt ${index + 1}`,
    balance: debt.balance,
    color: COLORS[index % COLORS.length]
  }));

  const comparisonData = result ? [
    {
      name: 'Current',
      monthly: result.current.totalMonthlyPayment,
      total: result.current.totalCost,
      interest: result.current.totalInterest
    },
    {
      name: 'Consolidated',
      monthly: result.consolidated.monthlyPayment,
      total: result.consolidated.totalCost,
      interest: result.consolidated.totalInterest
    }
  ] : [];

  const totalCurrentBalance = currentDebts.reduce((sum, debt) => sum + debt.balance, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Debt Consolidation Calculator</CardTitle>
            <CardDescription>
              Compare your current debt payments with a consolidation loan to see potential savings
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Debt Presets */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    Common Debt Scenarios
                  </FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {getDebtPresets().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyDebtPreset(preset)}
                      >
                        <div className="flex items-center gap-1">
                          {preset.icon}
                          <span>{preset.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Current Debts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Current Debts
                    </FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addDebt}>
                      Add Debt
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {currentDebts.map((_, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-between md:col-span-4 mb-2">
                          <span className="text-sm font-medium">Debt {index + 1}</span>
                          {currentDebts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDebt(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`currentDebts.${index}.balance`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Balance</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Balance" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`currentDebts.${index}.interestRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Interest Rate (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.1" placeholder="Rate" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`currentDebts.${index}.monthlyPayment`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monthly Payment</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="Payment" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex items-end">
                          <div className="text-sm text-muted-foreground">
                            Min: ${(currentDebts[index].balance * (currentDebts[index].interestRate / 100 / 12)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consolidation Loan Presets */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    Consolidation Loan Options
                  </FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {getConsolidationPresets().map((preset, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyConsolidationPreset(preset)}
                      >
                        <div className="flex flex-col">
                          <span>{preset.label}</span>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {preset.badge}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Consolidation Loan Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="consolidationLoan.amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          Loan Amount ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="consolidationLoan.interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                          Interest Rate (%)
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input type="number" step="0.1" {...field} />
                            <Slider
                              min={0}
                              max={30}
                              step={0.1}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="consolidationLoan.term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          Term (Months)
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input type="number" {...field} />
                            <Slider
                              min={12}
                              max={84}
                              step={6}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quick Summary */}
                {currentDebts.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Current Balance:</span>
                      <span className="font-semibold">${totalCurrentBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Average Interest Rate:</span>
                      <span className="font-semibold">
                        {((currentDebts.reduce((sum, debt) => sum + (debt.balance * debt.interestRate), 0) / totalCurrentBalance) || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Monthly Payments:</span>
                      <span className="font-semibold">
                        ${currentDebts.reduce((sum, debt) => sum + debt.monthlyPayment, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit" className="flex-1">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Savings
                </Button>
                {result && (
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
                Recent consolidation calculations (last 10)
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
                        <span className="font-bold text-primary">
                          ${item.currentDebts.reduce((sum, debt) => sum + debt.balance, 0).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.consolidationLoan.interestRate}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${item.savings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.savings > 0 ? 'Save' : 'Cost'} ${Math.abs(item.savings).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.consolidationLoan.term} months
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <>
            {/* Charts */}
            <Card>
              <CardHeader>
                <CardTitle>Savings Visualization</CardTitle>
                <CardDescription>
                  Compare your current situation with debt consolidation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Monthly Payment Comparison */}
                  <div className="h-64">
                    <ChartContainer config={chartConfig}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="monthly" fill="var(--color-consolidated)" />
                      </BarChart>
                    </ChartContainer>
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      Monthly Payment Comparison
                    </p>
                  </div>

                  {/* Total Cost Comparison */}
                  <div className="h-64">
                    <ChartContainer config={chartConfig}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="var(--color-current)" />
                      </BarChart>
                    </ChartContainer>
                    <p className="text-center text-sm text-muted-foreground mt-2">
                      Total Cost Comparison
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debt Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Current Debt Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ChartContainer config={chartConfig}>
                    <PieChart>
                      <Pie
                        data={debtBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="balance"
                      >
                        {debtBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                  {debtBreakdownData.map((debt, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: debt.color }}
                      />
                      <span>{debt.name}</span>
                      <span className="font-medium">${debt.balance.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Consolidation Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                {/* Monthly Savings */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Monthly Savings</p>
                  <p className={`text-3xl font-bold my-2 ${result.comparison.monthlySavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {result.comparison.monthlySavings > 0 ? '+' : ''}${result.comparison.monthlySavings.toFixed(2)}
                  </p>
                </div>

                {/* Total Savings */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Savings</span>
                    <span className={`font-semibold ${result.comparison.totalSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.comparison.totalSavings > 0 ? '+' : ''}${result.comparison.totalSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Interest Savings</span>
                    <span className={`font-semibold ${result.comparison.interestSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.comparison.interestSavings > 0 ? '+' : ''}${result.comparison.interestSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Time Saved</span>
                    <span className={`font-semibold ${result.comparison.timeSavings > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.comparison.timeSavings > 0 ? '+' : ''}{result.comparison.timeSavings} years
                    </span>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 border rounded-lg">
                      <p className="text-muted-foreground">Current Monthly</p>
                      <p className="font-semibold">${result.current.totalMonthlyPayment.toFixed(2)}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-muted-foreground">Consolidated Monthly</p>
                      <p className="font-semibold">${result.consolidated.monthlyPayment.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Key Insights */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Key Insights</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-left space-y-1">
                    <p>• {result.comparison.monthlySavings > 0 ? 'Save' : 'Pay'} ${Math.abs(result.comparison.monthlySavings).toFixed(2)} monthly</p>
                    <p>• Payoff in {result.consolidated.payoffTime} years vs {result.current.payoffTime} years</p>
                    <p>• {result.comparison.interestSavings > 0 ? 'Save' : 'Pay'} ${Math.abs(result.comparison.interestSavings).toLocaleString(undefined, { maximumFractionDigits: 2 })} in interest</p>
                    <p>• {result.comparison.totalSavings > 0 ? 'Total savings' : 'Additional cost'}: ${Math.abs(result.comparison.totalSavings).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>

                {result.comparison.totalSavings < 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        This consolidation would cost more than your current debts. Consider negotiating lower rates or exploring other options.
                      </p>
                    </div>
                  </div>
                )}

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
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your debt details to see consolidation savings and payment comparison.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Advice</CardTitle>
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
            <TabsTrigger value="strategies">Debt Strategies</TabsTrigger>
            <TabsTrigger value="considerations">Key Considerations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guide">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How does debt consolidation work?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Debt consolidation combines multiple debts into a single new loan, ideally with a lower interest rate and more manageable payment terms.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">The Consolidation Process</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>1. Assessment:</strong> Analyze all current debts and terms</p>
                          <p><strong>2. Qualification:</strong> Check eligibility for consolidation loan</p>
                          <p><strong>3. Application:</strong> Apply for new consolidation loan</p>
                          <p><strong>4. Payoff:</strong> Use new loan to pay off existing debts</p>
                          <p><strong>5. Management:</strong> Make single monthly payment</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">When It Works Best</h4>
                          <div className="text-sm space-y-2">
                            <p>• High-interest credit card debt</p>
                            <p>• Multiple monthly payments</p>
                            <p>• Good enough credit for better rate</p>
                            <p>• Stable income for new payment</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Potential Benefits</h4>
                          <div className="text-sm space-y-2">
                            <p>• Lower monthly payment</p>
                            <p>• Reduced interest rates</p>
                            <p>• Simplified payment management</p>
                            <p>• Faster debt payoff</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="calculation">
                <AccordionTrigger>How are the savings calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Savings are calculated by comparing your current debt repayment costs with the costs of a consolidation loan over the same period.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Current Debt Calculation</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>Total Monthly:</strong> Sum of all minimum payments</p>
                          <p><strong>Payoff Time:</strong> Longest individual debt payoff</p>
                          <p><strong>Total Interest:</strong> Sum of interest on all debts</p>
                          <p><strong>Total Cost:</strong> Principal + total interest</p>
                        </div>
                      </div>
                      
                      <div className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Consolidation Calculation</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>Monthly Payment:</strong> Standard amortization formula</p>
                          <p><strong>Payoff Time:</strong> Loan term in years</p>
                          <p><strong>Total Interest:</strong> Loan interest over full term</p>
                          <p><strong>Total Cost:</strong> Loan amount + total interest</p>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <CalculatorIcon className="h-4 w-4 text-blue-500" />
                          <h4 className="font-semibold">Savings Formula</h4>
                        </div>
                        <div className="font-mono text-sm">
                          Savings = Current Total Cost - Consolidated Total Cost
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
                <h3 className="font-semibold mb-4">Debt Repayment Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      strategy: "Debt Snowball",
                      approach: "Pay smallest debts first",
                      bestFor: "Quick wins and motivation",
                      details: "Pay minimums on all debts, extra on smallest balance"
                    },
                    {
                      strategy: "Debt Avalanche",
                      approach: "Pay highest interest first",
                      bestFor: "Maximum interest savings",
                      details: "Pay minimums on all debts, extra on highest rate"
                    },
                    {
                      strategy: "Debt Consolidation",
                      approach: "Combine into single loan",
                      bestFor: "Simplification and lower rates",
                      details: "Replace multiple payments with one lower-rate payment"
                    },
                    {
                      strategy: "Balance Transfer",
                      approach: "Move to 0% credit card",
                      bestFor: "Short-term interest relief",
                      details: "Transfer balances to introductory 0% APR card"
                    },
                    {
                      strategy: "Debt Management Plan",
                      approach: "Work with credit counselor",
                      bestFor: "Structured repayment help",
                      details: "Credit counseling agency negotiates with creditors"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-purple-200 bg-purple-50">
                        {item.strategy}
                      </Badge>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.approach}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1"><strong>Best for:</strong> {item.bestFor}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
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
                  <h3 className="font-semibold">Key Considerations & Risks</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">✅ Advantages</h4>
                    <div className="space-y-2">
                      <p><strong>Simplified Payments:</strong> One payment instead of multiple</p>
                      <p><strong>Potential Savings:</strong> Lower interest rates save money</p>
                      <p><strong>Fixed Terms:</strong> Predictable payoff timeline</p>
                      <p><strong>Credit Improvement:</strong> On-time payments help score</p>
                      <p><strong>Stress Reduction:</strong> Easier to manage single payment</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">⚠️ Risks & Drawbacks</h4>
                    <div className="space-y-2">
                      <p><strong>Higher Long-term Cost:</strong> If rate isn't significantly lower</p>
                      <p><strong>Fees:</strong> Origination fees, balance transfer fees</p>
                      <p><strong>Credit Impact:</strong> Hard inquiry, new account</p>
                      <p><strong>False Security:</strong> May lead to more debt accumulation</p>
                      <p><strong>Collateral Risk:</strong> Secured loans risk assets</p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-green-500" />
                      <h4 className="font-semibold">When to Consider Consolidation</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>• You can get a significantly lower interest rate</p>
                      <p>• Monthly payments become unmanageable</p>
                      <p>• You have good credit score (680+)</p>
                      <p>• You're committed to not accumulating new debt</p>
                      <p>• The math shows clear savings</p>
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