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
import { Calculator as CalculatorIcon, Lightbulb, TrendingUp, Calendar, DollarSign, Percent, Info, AlertTriangle } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();

const formSchema = z.object({
  initialAmount: z.coerce.number().min(1, 'Amount must be at least $1').max(1000000000, 'Amount is too large'),
  startYear: z.coerce.number().int().min(1900, 'Year must be after 1900').max(currentYear),
  endYear: z.coerce.number().int().min(1900, 'Year must be after 1900').max(2100),
  inflationRate: z.coerce.number().min(0.1, 'Inflation rate must be at least 0.1%').max(50, 'Inflation rate is too high'),
  calculationType: z.enum(['future', 'past']).default('future'),
}).refine(data => data.endYear > data.startYear, {
  message: 'End year must be after start year.',
  path: ['endYear'],
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  futureValue: number;
  purchasingPower: number;
  years: number;
  totalInflation: number;
}

export default function InflationCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startYear: currentYear - 10,
      endYear: currentYear,
      inflationRate: 3.0, // Historical average
      calculationType: 'future',
    }
  });

  const calculationType = form.watch('calculationType');

  const calculateInflation = (data: FormValues) => {
    const { initialAmount, startYear, endYear, inflationRate } = data;
    const years = Math.abs(endYear - startYear);
    const rate = inflationRate / 100;

    let futureValue, purchasingPower, totalInflation;

    if (calculationType === 'future') {
      futureValue = initialAmount * Math.pow(1 + rate, years);
      purchasingPower = (initialAmount / futureValue) * 100;
      totalInflation = futureValue - initialAmount;
    } else {
      // Calculate past value (what amount in the past would be equivalent to today's money)
      futureValue = initialAmount / Math.pow(1 + rate, years);
      purchasingPower = (futureValue / initialAmount) * 100;
      totalInflation = initialAmount - futureValue;
    }

    return { 
      futureValue, 
      purchasingPower, 
      years,
      totalInflation 
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateInflation(data);
    setResult(result);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Inflation Calculator',
        initialAmount: data.initialAmount,
        inflationRate: data.inflationRate,
        years: result.years,
        futureValue: result.futureValue
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("To beat inflation, your investments need to earn a higher return than the inflation rate. Consider diversifying your portfolio with assets that historically outpace inflation.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      initialAmount: undefined,
      startYear: currentYear - 10,
      endYear: currentYear,
      inflationRate: 3.0,
      calculationType: 'future',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const historicalRates = [
    { year: '2020-2023', rate: 4.7, description: 'Post-pandemic surge' },
    { year: '2010-2019', rate: 1.8, description: 'Low inflation period' },
    { year: '2000-2009', rate: 2.6, description: 'Stable growth' },
    { year: '1990-1999', rate: 2.9, description: 'Moderate inflation' },
    { year: '1980-1989', rate: 5.6, description: 'High inflation era' },
    { year: '1970-1979', rate: 7.1, description: 'Stagflation period' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Inflation Calculator</CardTitle>
            <CardDescription>
              Understand how inflation affects the purchasing power of your money over time
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="calculationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select calculation type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="future">Future Value (Past → Future)</SelectItem>
                          <SelectItem value="past">Equivalent Past Value (Future → Past)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="initialAmount" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {calculationType === 'future' ? 'Initial Amount ($)' : 'Current Amount ($)'}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="startYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {calculationType === 'future' ? 'Start Year' : 'Target Past Year'}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="endYear" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {calculationType === 'future' ? 'End Year' : 'Current Year'}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="inflationRate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Avg. Inflation (%)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Historical Reference */}
                <div className="pt-4 border-t">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    Historical Inflation Reference (US Average)
                  </CardDescription>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {historicalRates.slice(0, 3).map((item, index) => (
                      <Badge key={index} variant="outline" className="flex flex-col items-center p-2">
                        <span className="font-semibold">{item.year}</span>
                        <span>{item.rate}%</span>
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
                  Calculate Inflation
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Inflation Impact Visualization */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Inflation Impact Over Time</CardTitle>
              <CardDescription>
                How {result.years} years of inflation affects purchasing power
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      {calculationType === 'future' ? 'Original Amount' : 'Current Amount'}
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${form.getValues('initialAmount').toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      {calculationType === 'future' ? 'Future Equivalent' : 'Past Equivalent'}
                    </p>
                    <p className="text-2xl font-bold text-green-700">
                      ${result.futureValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">
                      {calculationType === 'future' ? 'Total Inflation' : 'Value Lost'}
                    </p>
                    <p className="text-lg font-semibold text-green-700">
                      ${Math.abs(result.totalInflation).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
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
              <TabsTrigger value="inflation">About Inflation</TabsTrigger>
              <TabsTrigger value="strategies">Protection Strategies</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How is inflation calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        Inflation reduces the purchasing power of money over time. The future value 
                        is calculated using the compound interest formula:
                      </p>
                      <div className="bg-muted p-4 rounded-md text-center font-mono text-sm">
                        Future Value = Initial Amount × (1 + Inflation Rate) ^ Years
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Example:</h4>
                          <p className="text-muted-foreground">
                            $1,000 at 3% inflation for 10 years:<br />
                            $1,000 × (1.03)^10 = $1,343.92
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Purchasing Power:</h4>
                          <p className="text-muted-foreground">
                            What $1,000 buys today would cost $1,343.92 in 10 years at 3% inflation.
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="inflation">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-2">What is Inflation?</h4>
                        <p className="text-sm text-muted-foreground">
                          Inflation is the rate at which prices for goods and services rise, 
                          resulting in a decrease in purchasing power over time.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-2">Common Causes</h4>
                        <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                          <li>Increased money supply</li>
                          <li>Rising production costs</li>
                          <li>Strong consumer demand</li>
                          <li>Supply chain disruptions</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2">Historical Context</h4>
                      <p className="text-sm text-yellow-700">
                        The US Federal Reserve targets 2% annual inflation as healthy for economic growth. 
                        Higher rates can indicate economic instability.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategies">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Strategies to Beat Inflation</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="font-medium text-green-600">Investment Options</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Stock market investments</li>
                          <li>Real estate properties</li>
                          <li>TIPS (Treasury Inflation-Protected Securities)</li>
                          <li>Commodities and precious metals</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium text-blue-600">Personal Finance</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Invest in skills and education</li>
                          <li>Diversify income streams</li>
                          <li>Consider cost-of-living adjustments</li>
                          <li>Review and adjust budgets regularly</li>
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
            <CardTitle>Inflation Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {calculationType === 'future' 
                      ? `$${form.getValues('initialAmount').toLocaleString()} in ${form.getValues('startYear')} is equivalent to`
                      : `$${form.getValues('initialAmount').toLocaleString()} today had the same buying power as`
                    }
                  </p>
                  <p className="text-4xl font-bold text-primary my-2">
                    ${result.futureValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {calculationType === 'future' 
                      ? `in ${form.getValues('endYear')}`
                      : `in ${form.getValues('startYear')}`
                    }
                  </p>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Purchasing Power Change</p>
                    <p className={`text-2xl font-bold ${result.purchasingPower < 100 ? 'text-red-600' : 'text-green-600'}`}>
                      {calculationType === 'future' 
                        ? `-${(100 - result.purchasingPower).toFixed(2)}%`
                        : `+${(result.purchasingPower - 100).toFixed(2)}%`
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {calculationType === 'future' ? 'Decrease' : 'Increase'} over {result.years} years
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Annual Inflation</span>
                    <span className="font-semibold">{form.getValues('inflationRate')}%</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Time Period</span>
                    <span className="font-semibold">{result.years} years</span>
                  </div>
                </div>

                {/* Quick Insight */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What This Means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {calculationType === 'future'
                      ? `To maintain your current lifestyle in ${form.getValues('endYear')}, you would need $${result.futureValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} to have the same purchasing power as $${form.getValues('initialAmount').toLocaleString()} today.`
                      : `Your money had more purchasing power in the past. What costs $${form.getValues('initialAmount').toLocaleString()} today would have only cost $${result.futureValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} in ${form.getValues('startYear')}.`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your details to see how inflation affects purchasing power.
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