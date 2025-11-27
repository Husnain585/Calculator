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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Lightbulb, TrendingUp, Calendar, DollarSign, Percent, Zap } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  presentValue: z.coerce.number().min(0, 'Present value must be positive'),
  interestRate: z.coerce.number().min(0, 'Interest rate must be positive'),
  years: z.coerce.number().min(1, 'Must be at least 1 year').max(100, 'Maximum 100 years'),
  compoundingFrequency: z.coerce.number().min(1, 'Must compound at least annually').max(365, 'Maximum daily compounding'),
});

type FormValues = z.infer<typeof formSchema>;

type CalculationResult = {
  futureValue: number;
  totalInterest: number;
  breakdown: { year: number; value: number; interest: number }[];
};

export default function FutureValueCalculator() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [calculations, setCalculations] = useState<CalculationResult[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      presentValue: 1000,
      interestRate: 5,
      years: 10,
      compoundingFrequency: 1,
    },
  });

  const calculateFutureValue = (data: FormValues): CalculationResult => {
    const { presentValue, interestRate, years, compoundingFrequency } = data;
    const ratePerPeriod = interestRate / 100 / compoundingFrequency;
    const totalPeriods = years * compoundingFrequency;
    
    const futureValue = presentValue * Math.pow(1 + ratePerPeriod, totalPeriods);
    const totalInterest = futureValue - presentValue;

    // Generate yearly breakdown (simplified for annual display)
    const breakdown = [];
    for (let year = 1; year <= years; year++) {
      const yearValue = presentValue * Math.pow(1 + interestRate / 100, year);
      const yearInterest = yearValue - presentValue;
      breakdown.push({
        year,
        value: yearValue,
        interest: yearInterest,
      });
    }

    return {
      futureValue,
      totalInterest,
      breakdown,
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const calculation = calculateFutureValue(data);
    setResult(calculation);
    setCalculations(prev => [calculation, ...prev.slice(0, 2)]); // Keep last 3 calculations

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Future Value Calculator',
        inputs: data
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consider increasing your investment amount or exploring higher-yield options. The power of compounding works best over longer time periods.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      presentValue: 1000,
      interestRate: 5,
      years: 10,
      compoundingFrequency: 1,
    });
    setResult(null);
    setSuggestion('');
    setCalculations([]);
    setSuggestionLoading(false);
  };

  const applyPreset = (preset: 'retirement' | 'savings' | 'investment') => {
    const presets = {
      retirement: { presentValue: 50000, interestRate: 7, years: 30, compoundingFrequency: 1 },
      savings: { presentValue: 5000, interestRate: 2, years: 5, compoundingFrequency: 12 },
      investment: { presentValue: 10000, interestRate: 10, years: 15, compoundingFrequency: 4 },
    };
    form.reset(presets[preset]);
  };

  const presentValue = form.watch('presentValue');
  const interestRate = form.watch('interestRate');
  const years = form.watch('years');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel - Forms & Features (2/3 width) */}
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <CardTitle>Future Value Calculator</CardTitle>
                </div>
                <CardDescription>
                  Calculate how your investments will grow over time with compound interest.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Presets */}
                <div className="space-y-3">
                  <FormLabel className="text-base">Quick Presets</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => applyPreset('retirement')}
                    >
                      Retirement Planning
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => applyPreset('savings')}
                    >
                      Savings Account
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => applyPreset('investment')}
                    >
                      Stock Investment
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="presentValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Present Value ($)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="100" {...field} />
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
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Time Period (Years)
                        </FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <Input type="number" {...field} />
                            <Slider
                              min={1}
                              max={50}
                              step={1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>1 year</span>
                              <span>{field.value} years</span>
                              <span>50 years</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="compoundingFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compounding Frequency</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="1">Annually</option>
                            <option value="2">Semi-annually</option>
                            <option value="4">Quarterly</option>
                            <option value="12">Monthly</option>
                            <option value="365">Daily</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Quick Calculation Preview */}
                <div className="pt-4 border-t">
                  <FormLabel className="text-base">Projection Preview</FormLabel>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-center">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">5 Years</p>
                      <p className="font-semibold">
                        ${(presentValue * Math.pow(1 + interestRate / 100, 5)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">10 Years</p>
                      <p className="font-semibold">
                        ${(presentValue * Math.pow(1 + interestRate / 100, 10)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">20 Years</p>
                      <p className="font-semibold">
                        ${(presentValue * Math.pow(1 + interestRate / 100, 20)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Future Value
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Recent Calculations */}
        {calculations.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Recent Calculations</CardTitle>
              </div>
              <CardDescription>Your last {calculations.length} future value calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calculations.map((calc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">${calc.futureValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-sm text-muted-foreground">
                        From ${form.watch('presentValue')} at {form.watch('interestRate')}% over {form.watch('years')} years
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-green-600">
                      +${calc.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - Results (1/3 width, sticky) */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Investment Growth</CardTitle>
            <CardDescription>
              {years} years at {interestRate}% annual rate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {result ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Future Value</p>
                  <p className="text-4xl font-bold text-primary">
                    ${result.futureValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Interest</p>
                    <p className="text-xl font-semibold text-green-600">
                      +${result.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Growth</p>
                    <p className="text-xl font-semibold text-primary">
                      {((result.totalInterest / presentValue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Yearly Breakdown Preview */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm">Yearly Growth</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.breakdown.slice(0, 10).map((year) => (
                      <div key={year.year} className="flex justify-between items-center text-sm">
                        <span>Year {year.year}</span>
                        <span>${year.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                    {result.breakdown.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ... and {result.breakdown.length - 10} more years
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-muted-foreground mb-2">Configure your investment to see</p>
                  <p className="font-semibold">Future Value Projection</p>
                </div>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-4 flex flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Optimization Tip</CardTitle>
                </CardHeader>
                <CardDescription className="text-left">
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

      {/* Bottom Panel - Education (full width) */}
      <div className="lg:col-span-3">
        <Tabs defaultValue="concept" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="concept" className="flex items-center gap-2">
              
              Compound Interest
            </TabsTrigger>
            <TabsTrigger value="strategies" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Investment Strategies
            </TabsTrigger>
            <TabsTrigger value="formula" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculation Method
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="concept" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">The Power of Compounding</h4>
                    <p className="text-sm text-muted-foreground">
                      Compound interest is interest calculated on the initial principal and also on 
                      the accumulated interest of previous periods. This creates a snowball effect 
                      where your money grows exponentially over time.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Key Factors</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• <strong>Principal:</strong> Initial investment amount</li>
                        <li>• <strong>Interest Rate:</strong> Annual return percentage</li>
                        <li>• <strong>Time:</strong> Duration of investment</li>
                        <li>• <strong>Compounding Frequency:</strong> How often interest is calculated</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">The Rule of 72</h4>
                      <p className="text-sm text-muted-foreground">
                        Divide 72 by your annual interest rate to estimate how many years it will take 
                        for your investment to double. At 6% interest, your money doubles every 12 years.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="strategies" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Maximizing Returns</h4>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Start Early:</strong> Time is your greatest advantage in compounding</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Regular Contributions:</strong> Consistent investing amplifies growth</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Reinvest Earnings:</strong> Compound returns by keeping interest invested</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Common Applications</h4>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Retirement Accounts:</strong> 401(k), IRAs with long-term growth</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Education Savings:</strong> 529 plans for future education costs</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Wealth Building:</strong> Stock market investments and index funds</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="formula" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-3">Future Value Formula</h4>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      FV = PV × (1 + r/n)^(n×t)
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Variables Explained</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li><strong>FV:</strong> Future Value of investment</li>
                        <li><strong>PV:</strong> Present Value (initial investment)</li>
                        <li><strong>r:</strong> Annual interest rate (as decimal)</li>
                        <li><strong>n:</strong> Compounding periods per year</li>
                        <li><strong>t:</strong> Time in years</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Real Example</h4>
                      <p className="text-sm text-muted-foreground">
                        $1,000 at 5% annual interest compounded monthly for 10 years:
                        <br />
                        FV = 1000 × (1 + 0.05/12)^(12×10) = $1,647.01
                      </p>
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