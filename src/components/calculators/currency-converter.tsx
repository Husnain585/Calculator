"use client";

import { useState, useEffect } from 'react';
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
import { Calculator as CalculatorIcon, Lightbulb, ArrowRightLeft, DollarSign, TrendingUp, AlertTriangle, Info, Globe, RefreshCw } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  amount: z.coerce.number().min(0, 'Amount must be a positive number'),
  fromCurrency: z.string().min(1, 'Please select a currency'),
  toCurrency: z.string().min(1, 'Please select a currency'),
});

type FormValues = z.infer<typeof formSchema>;

interface ExchangeRate {
  code: string;
  name: string;
  rate: number;
  flag: string;
  trend: 'up' | 'down' | 'stable';
}

const CURRENCIES: ExchangeRate[] = [
  { code: 'USD', name: 'US Dollar', rate: 1, flag: '🇺🇸', trend: 'stable' },
  { code: 'PKR', name: 'Pakistani Rupee', rate: 278.50, flag: '🇵🇰', trend: 'down' },
  { code: 'EUR', name: 'Euro', rate: 0.92, flag: '🇪🇺', trend: 'up' },
  { code: 'GBP', name: 'British Pound', rate: 0.79, flag: '🇬🇧', trend: 'up' },
  { code: 'AED', name: 'UAE Dirham', rate: 3.67, flag: '🇦🇪', trend: 'stable' },
  { code: 'SAR', name: 'Saudi Riyal', rate: 3.75, flag: '🇸🇦', trend: 'stable' },
  { code: 'CAD', name: 'Canadian Dollar', rate: 1.35, flag: '🇨🇦', trend: 'down' },
  { code: 'AUD', name: 'Australian Dollar', rate: 1.52, flag: '🇦🇺', trend: 'down' },
  { code: 'JPY', name: 'Japanese Yen', rate: 148.50, flag: '🇯🇵', trend: 'up' },
  { code: 'CNY', name: 'Chinese Yuan', rate: 7.18, flag: '🇨🇳', trend: 'stable' },
];

interface Result {
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  inverseRate: number;
}

export default function CurrencyConverter() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromCurrency: 'USD',
      toCurrency: 'PKR',
      amount: undefined,
    },
  });

  const fromCurrency = form.watch('fromCurrency');
  const toCurrency = form.watch('toCurrency');
  const amount = form.watch('amount');

  // Update last updated time
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  const getCurrency = (code: string) => CURRENCIES.find(c => c.code === code);
  const getExchangeRate = (from: string, to: string) => {
    const fromCurr = getCurrency(from);
    const toCurr = getCurrency(to);
    if (!fromCurr || !toCurr) return 1;
    return toCurr.rate / fromCurr.rate;
  };

  const getTrendColor = (trend: string) => {
    const colors = {
      'up': 'text-green-500',
      'down': 'text-red-500',
      'stable': 'text-gray-500',
    };
    return colors[trend as keyof typeof colors];
  };

  const getTrendIcon = (trend: string) => {
    const icons = {
      'up': '↗️',
      'down': '↘️',
      'stable': '→',
    };
    return icons[trend as keyof typeof icons];
  };

  const swapCurrencies = () => {
    const currentFrom = form.getValues('fromCurrency');
    const currentTo = form.getValues('toCurrency');
    form.setValue('fromCurrency', currentTo);
    form.setValue('toCurrency', currentFrom);
    
    // Recalculate if we have a result
    if (result && amount) {
      const newRate = getExchangeRate(currentTo, currentFrom);
      const newAmount = amount * newRate;
      setResult({
        fromAmount: amount,
        toAmount: newAmount,
        fromCurrency: currentTo,
        toCurrency: currentFrom,
        exchangeRate: newRate,
        inverseRate: 1 / newRate
      });
    }
  };

  const refreshRates = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLastUpdated(new Date().toLocaleTimeString());
      setIsLoading(false);
      // In a real app, you would update the rates from an API here
    }, 1000);
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { amount, fromCurrency, toCurrency } = data;
    const exchangeRate = getExchangeRate(fromCurrency, toCurrency);
    const toAmount = amount * exchangeRate;

    setResult({ 
      fromAmount: amount, 
      toAmount,
      fromCurrency,
      toCurrency,
      exchangeRate,
      inverseRate: 1 / exchangeRate
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Currency Converter',
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount: toAmount,
        exchangeRate
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Exchange rates fluctuate daily. For large transactions, consider using limit orders or forward contracts to lock in favorable rates.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      amount: undefined,
      fromCurrency: 'USD',
      toCurrency: 'PKR',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const fromCurr = getCurrency(fromCurrency);
  const toCurr = getCurrency(toCurrency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Currency Converter</CardTitle>
            <CardDescription>
              Convert between world currencies with real-time exchange rates
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount to Convert</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="e.g., 100" 
                            className="pl-10 text-lg"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fromCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{currency.flag}</span>
                                  <span>{currency.code}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {currency.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end justify-center pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={swapCurrencies}
                      className="h-10 w-10"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="toCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{currency.flag}</span>
                                  <span>{currency.code}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {currency.name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Exchange Rate Info */}
                {fromCurr && toCurr && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>Current Rate:</span>
                        <Badge variant="outline" className="font-mono">
                          1 {fromCurrency} = {getExchangeRate(fromCurrency, toCurrency).toFixed(4)} {toCurrency}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${getTrendColor(toCurr.trend)}`}>
                          {getTrendIcon(toCurr.trend)} {toCurr.trend}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={refreshRates}
                          disabled={isLoading}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last updated: {lastUpdated}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit" disabled={!amount}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Convert Currency
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Popular Conversions */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Conversions</CardTitle>
            <CardDescription>
              Quick conversions for common currency pairs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { from: 'USD', to: 'PKR' },
                { from: 'EUR', to: 'PKR' },
                { from: 'AED', to: 'PKR' },
                { from: 'SAR', to: 'PKR' },
                { from: 'GBP', to: 'USD' },
                { from: 'USD', to: 'EUR' },
              ].map((pair, index) => {
                const rate = getExchangeRate(pair.from, pair.to);
                return (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    className="h-auto py-3 justify-start"
                    onClick={() => {
                      form.setValue('fromCurrency', pair.from);
                      form.setValue('toCurrency', pair.to);
                      if (amount) {
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">{pair.from} → {pair.to}</div>
                      <div className="text-xs text-muted-foreground">
                        1 {pair.from} = {rate.toFixed(2)} {pair.to}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Conversion Result</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">You convert</p>
                  <p className="text-2xl font-bold my-2">
                    {result.fromAmount.toLocaleString('en-US', { 
                      style: 'currency', 
                      currency: result.fromCurrency,
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>

                <div className="flex items-center justify-center text-muted-foreground">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">You receive</p>
                  <p className="text-4xl font-bold text-primary my-2">
                    {result.toAmount.toLocaleString('en-US', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-lg font-semibold">{result.toCurrency}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Exchange Rate</p>
                    <p className="font-semibold text-sm">
                      1 {result.fromCurrency} = {result.exchangeRate.toFixed(4)} {result.toCurrency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Inverse Rate</p>
                    <p className="font-semibold text-sm">
                      1 {result.toCurrency} = {result.inverseRate.toFixed(4)} {result.fromCurrency}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Good to Know</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.exchangeRate > 10 ? 'This currency has a high exchange rate. Small changes can significantly impact the converted amount.' :
                     result.exchangeRate < 0.1 ? 'This currency has a low exchange rate. You get more units for your money.' :
                     'The exchange rate is moderate. Monitor rate fluctuations for optimal conversion timing.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter an amount and select currencies to see conversion.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Conversion Tip</CardTitle>
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
            <TabsTrigger value="strategies">Conversion Strategies</TabsTrigger>
            <TabsTrigger value="considerations">Important Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is currency conversion calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Currency conversion uses exchange rates that represent the value of one currency in terms of another. 
                      These rates fluctuate based on market conditions, economic factors, and geopolitical events.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Conversion Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Target Amount = Source Amount × Exchange Rate
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Multiply your source currency amount by the current exchange rate
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Direct Rate</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            1 USD = X PKR
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            How much of the target currency you get for 1 unit of source currency
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Inverse Rate</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            1 PKR = Y USD
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            How much of the source currency you get for 1 unit of target currency
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Cross Rate Calculation</h4>
                        <div className="font-mono bg-muted p-3 rounded-md text-xs">
                          USD/PKR = (USD/EUR) × (EUR/PKR)
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          For currencies without direct pairs, rates are calculated through common base currencies
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
                <h3 className="font-semibold mb-4">Smart Currency Conversion Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      strategy: "Monitor Rate Trends",
                      description: "Track currency trends over time and convert when rates are favorable. Use rate alerts to notify you of significant changes.",
                      impact: "High savings"
                    },
                    {
                      strategy: "Use Limit Orders",
                      description: "Set a target exchange rate with your bank or exchange service. The conversion happens automatically when the rate is reached.",
                      impact: "High savings"
                    },
                    {
                      strategy: "Avoid Airport Exchanges",
                      description: "Airport currency exchanges typically offer poor rates with high fees. Plan ahead and exchange before travel.",
                      impact: "Medium savings"
                    },
                    {
                      strategy: "Compare Multiple Providers",
                      description: "Check rates from banks, online services, and local exchanges. Small differences add up on large amounts.",
                      impact: "Medium savings"
                    },
                    {
                      strategy: "Consider Transfer Timing",
                      description: "Exchange rates fluctuate throughout the day. Major financial center trading hours often have better rates.",
                      impact: "Low savings"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          item.impact === 'High savings' ? 'border-green-200 bg-green-50' : 
                          item.impact === 'Medium savings' ? 'border-yellow-200 bg-yellow-50' : 
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
                  <h3 className="font-semibold">Important Currency Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>When converting currencies, keep these important factors in mind:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Exchange Rate Margins:</strong> Banks and exchanges add margins to market rates - always check the actual rate you'll receive</li>
                    <li><strong>Transfer Fees:</strong> International transfers often have fixed fees that can outweigh better exchange rates</li>
                    <li><strong>Market Volatility:</strong> Currency values can change rapidly due to economic news and political events</li>
                    <li><strong>Regulatory Limits:</strong> Some countries have restrictions on currency conversion amounts</li>
                    <li><strong>Tax Implications:</strong> Large currency conversions may have tax consequences in some jurisdictions</li>
                    <li><strong>Weekend Rates:</strong> Exchange rates may be less favorable during weekends when markets are closed</li>
                  </ul>
                  <p className="font-medium mt-4">
                    This calculator uses approximate rates for demonstration. Always verify current rates with your financial institution 
                    before making transactions. Rates may include margins and fees not reflected here.
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