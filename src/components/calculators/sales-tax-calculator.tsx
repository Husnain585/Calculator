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
import { Calculator as CalculatorIcon, Lightbulb, DollarSign, Percent, Receipt, MapPin, AlertTriangle, Info, ShoppingCart } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').default(1),
  calculationType: z.enum(['addTax', 'reverseTax']).default('addTax'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  taxAmount: number;
  totalPrice: number;
  basePrice: number;
  taxPercentage: number;
}

export default function SalesTaxCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: undefined,
      taxRate: undefined,
      quantity: 1,
      calculationType: 'addTax',
    },
  });

  const calculationType = form.watch('calculationType');
  const taxRate = form.watch('taxRate');

  const popularTaxRates = [
    { state: 'California', rate: 7.25, local: 2.5 },
    { state: 'Texas', rate: 6.25, local: 2.0 },
    { state: 'New York', rate: 4.0, local: 4.5 },
    { state: 'Florida', rate: 6.0, local: 1.5 },
    { state: 'Illinois', rate: 6.25, local: 4.75 },
    { state: 'Pennsylvania', rate: 6.0, local: 2.0 },
  ];

  const getTaxLevel = (taxRate: number) => {
    if (taxRate < 5) return 'low';
    if (taxRate < 8) return 'medium';
    if (taxRate < 10) return 'high';
    return 'very-high';
  };

  const getTaxColor = (level: string) => {
    const colors = {
      'low': 'bg-green-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-orange-500',
      'very-high': 'bg-red-500',
    };
    return colors[level as keyof typeof colors];
  };

  const getTaxText = (level: string) => {
    const texts = {
      'low': 'Low Tax Rate',
      'medium': 'Medium Tax Rate',
      'high': 'High Tax Rate',
      'very-high': 'Very High Tax Rate',
    };
    return texts[level as keyof typeof texts];
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { price, taxRate, quantity, calculationType } = data;
    
    let taxAmount, totalPrice, basePrice;

    if (calculationType === 'addTax') {
      basePrice = price * quantity;
      taxAmount = basePrice * (taxRate / 100);
      totalPrice = basePrice + taxAmount;
    } else {
      // Reverse calculation: total price includes tax, find base price
      totalPrice = price * quantity;
      basePrice = totalPrice / (1 + taxRate / 100);
      taxAmount = totalPrice - basePrice;
    }

    setResult({ 
      taxAmount, 
      totalPrice, 
      basePrice,
      taxPercentage: taxRate
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Sales Tax Calculator',
        taxRate,
        taxAmount,
        totalPrice
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Planning a big purchase? Consider shopping in areas with lower sales tax rates, or look for tax-free weekends in your state.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({ 
      price: undefined, 
      taxRate: undefined,
      quantity: 1,
      calculationType: 'addTax'
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const applyPopularTaxRate = (rate: number) => {
    form.setValue('taxRate', rate);
  };

  const taxLevel = taxRate ? getTaxLevel(taxRate) : 'medium';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Sales Tax Calculator</CardTitle>
            <CardDescription>
              Calculate sales tax for purchases or reverse-calculate pre-tax prices
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
                          <SelectItem value="addTax">Add Tax to Price</SelectItem>
                          <SelectItem value="reverseTax">Reverse Calculate (Price includes Tax)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {calculationType === 'addTax' ? 'Pre-Tax Price ($)' : 'Total Price (incl. tax) ($)'}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder={calculationType === 'addTax' ? "e.g., 99.99" : "e.g., 108.49"} 
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
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g., 1" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Tax Rate (%)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            <div className="relative">
                              <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="e.g., 8.5" 
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                            <Slider
                              value={[field.value || 0]}
                              onValueChange={(value) => field.onChange(value[0])}
                              max={15}
                              step={0.1}
                              className="py-2"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {taxRate && (
                    <div className="flex items-center gap-2">
                      <Badge className={`${getTaxColor(taxLevel)} text-white`}>
                        {getTaxText(taxLevel)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Compared to national average
                      </span>
                    </div>
                  )}
                </div>

                {/* Popular Tax Rates */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <FormLabel>Popular Tax Rates</FormLabel>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {popularTaxRates.map((location, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto py-2 text-xs"
                        onClick={() => applyPopularTaxRate(location.rate + location.local)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{location.state}</div>
                          <div className="text-muted-foreground">
                            {(location.rate + location.local).toFixed(1)}%
                          </div>
                        </div>
                      </Button>
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
                  Calculate Tax
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Tax Breakdown Visualization */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Tax Breakdown</CardTitle>
              <CardDescription>
                Visualize how tax affects your total price
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item Price</span>
                  <span className="font-semibold">${result.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sales Tax</span>
                  <span className="font-semibold">${result.taxAmount.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 float-left"
                    style={{ 
                      width: `${(result.basePrice / result.totalPrice) * 100}%` 
                    }}
                  />
                  <div 
                    className="h-full bg-red-500 float-left"
                    style={{ 
                      width: `${(result.taxAmount / result.totalPrice) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Price: {((result.basePrice / result.totalPrice) * 100).toFixed(1)}%</span>
                  <span>Tax: {((result.taxAmount / result.totalPrice) * 100).toFixed(1)}%</span>
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
            <CardTitle>Total Price</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-5xl font-bold my-2">${result.totalPrice.toFixed(2)}</p>
                  <Badge variant="outline" className="bg-blue-50">
                    <Receipt className="h-3 w-3 mr-1" />
                    Includes Tax
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Price</p>
                    <p className="font-semibold">${result.basePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sales Tax</p>
                    <p className="font-semibold">${result.taxAmount.toFixed(2)}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Effective Tax Rate</p>
                  <p className="text-2xl font-semibold">{((result.taxAmount / result.basePrice) * 100).toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground">
                    Of the base price
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What this means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.taxPercentage < 5 ? 'You have a favorable tax rate. This is below the national average.' :
                     result.taxPercentage < 8 ? 'Your tax rate is close to the national average.' :
                     result.taxPercentage < 10 ? 'Your tax rate is above average. Consider tax-free shopping options.' :
                     'You have a high tax rate. Look for tax exemptions or shop during tax-free events.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter price and tax rate to calculate totals.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Shopping Tip</CardTitle>
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
            <TabsTrigger value="strategies">Tax Saving Tips</TabsTrigger>
            <TabsTrigger value="considerations">Important Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is sales tax calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Sales tax is calculated as a percentage of the purchase price. 
                      Some states have combined state and local taxes, while others may exempt certain items.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Standard Tax Calculation</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Total Price = Base Price + (Base Price × Tax Rate / 100)
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Used when you know the pre-tax price and want to find the total cost
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Reverse Tax Calculation</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Base Price = Total Price ÷ (1 + Tax Rate / 100)
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Used when you know the total price including tax and want to find the pre-tax amount
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Tax Amount Formula</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Tax = Base Price × (Tax Rate / 100)
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Effective Rate</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Effective Rate = (Tax Amount / Base Price) × 100
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
                <h3 className="font-semibold mb-4">Sales Tax Saving Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      strategy: "Shop During Tax-Free Holidays",
                      description: "Many states offer tax-free weekends for back-to-school shopping, emergency preparedness, or energy-efficient items.",
                      impact: "High savings"
                    },
                    {
                      strategy: "Consider Online Purchases",
                      description: "Some online retailers may not charge sales tax, though this is becoming less common due to new regulations.",
                      impact: "Medium savings"
                    },
                    {
                      strategy: "Look for Tax-Exempt Items",
                      description: "Groceries, prescription drugs, and clothing (in some states) may be exempt from sales tax.",
                      impact: "High savings"
                    },
                    {
                      strategy: "Shop in Neighboring States",
                      description: "If you live near a state border, compare tax rates - sometimes driving a short distance can save significantly.",
                      impact: "Medium savings"
                    },
                    {
                      strategy: "Use Tax-Exempt Status",
                      description: "Non-profit organizations, businesses for resale, and government entities may qualify for tax exemption.",
                      impact: "High savings"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          item.impact === 'High savings' ? 'border-green-200 bg-green-50' : 
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
                  <h3 className="font-semibold">Important Tax Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>When calculating and planning for sales tax, keep these factors in mind:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Combined Rates:</strong> Total tax rate often includes state, county, and city taxes</li>
                    <li><strong>Use Tax:</strong> You may owe use tax on out-of-state purchases where sales tax wasn't collected</li>
                    <li><strong>Item Variations:</strong> Different products may have different tax rates (e.g., luxury items vs necessities)</li>
                    <li><strong>Local Changes:</strong> Tax rates can change frequently at local levels</li>
                    <li><strong>Online Purchases:</strong> Most states now require online retailers to collect sales tax</li>
                    <li><strong>Business Purchases:</strong> Businesses can often claim sales tax paid on business expenses</li>
                  </ul>
                  <p className="font-medium mt-4">
                    Always verify current tax rates with local authorities, as rates can change and 
                    special district taxes may apply. Consider consulting with a tax professional for business-related purchases.
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