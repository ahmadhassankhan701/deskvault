"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Package, Search } from "lucide-react";
import { format } from 'date-fns';

import { products as initialProducts, transactions, partners } from "@/lib/data";
import type { Product, Transaction, Partner } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const productSchema = z.object({
  type: z.enum(["individual", "sku"]),
  name: z.string().min(1, "Product name is required."),
  category: z.string().min(1, "Category is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative."),
  imei: z.string().min(1, "IMEI is required."),
}).refine(data => {
    if (data.type === 'individual') {
        return data.stock === 1;
    }
    return true;
}, {
    message: "Stock must be 1 for individual products.",
    path: ["stock"],
});


type EnrichedProduct = Product & { transaction?: Transaction, partner?: Partner };

export function InventoryTab() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      type: "sku",
      name: "",
      category: "",
      stock: 0,
      price: 0,
      imei: "",
    },
  });
  
  const productType = form.watch("type");

  useEffect(() => {
    if (productType === "individual") {
      form.setValue("stock", 1);
    } else {
      if (form.getValues("stock") === 1) {
          form.setValue("stock", 0);
      }
    }
  }, [productType, form]);

 const filteredProducts = useMemo((): EnrichedProduct[] => {
    const transactionMap = new Map<string, Transaction>();
    transactions.forEach(t => transactionMap.set(t.productId, t));
    
    const partnerMap = new Map<string, Partner>();
    partners.forEach(p => partnerMap.set(p.name, p));

    let tabProducts: Product[] = [];

    if (activeTab === 'active') {
        tabProducts = initialProducts.filter(p => p.stock > 0 && !transactionMap.has(p.id));
    } else {
        const relevantTxnTypes: string[] = {
            'sold': ['sale'],
            'borrowed': ['borrow-in'],
            'lent': ['lend-out'],
        }[activeTab] || [];
        
        const productIdsInTransactions = transactions
            .filter(t => relevantTxnTypes.includes(t.type))
            .map(t => t.productId);
            
        tabProducts = initialProducts.filter(p => productIdsInTransactions.includes(p.id));
    }

    let enriched = tabProducts.map(p => {
        const transaction = transactionMap.get(p.id);
        const partner = transaction ? partnerMap.get(transaction.party) : undefined;
        return { ...p, transaction, partner };
    });

    if (!searchTerm) {
      return enriched;
    }

    return enriched.filter(product =>
      product.imei.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTab, searchTerm]);


  function onSubmit(values: z.infer<typeof productSchema>) {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      barcode: values.imei, // Using imei as barcode
      ...values,
      stock: values.type === 'individual' ? 1 : values.stock,
    };
    setProducts([newProduct, ...products]);
    toast({
      title: "Product Added",
      description: `${values.name} has been added to the inventory.`,
    });
    setIsDialogOpen(false);
    form.reset();
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return (
        <Badge variant="destructive">Out of Stock</Badge>
      );
    if (stock < 10 && stock > 0)
      return (
        <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
          Low Stock
        </Badge>
      );
    return <Badge variant="secondary">In Stock</Badge>;
  };

  const renderActiveTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProducts.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <Badge variant={product.type === 'individual' ? 'outline' : 'secondary'} className="gap-1 capitalize">
                <Package className="h-3 w-3" />
                {product.type}
              </Badge>
            </TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>{product.stock}</TableCell>
            <TableCell className="font-mono text-xs">{product.imei}</TableCell>
            <TableCell>{getStockStatus(product.stock)}</TableCell>
            <TableCell className="text-right">
              ${product.price.toFixed(2)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderSoldTable = () => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Buyer Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Selling Date</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead className="text-right">Sold Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProducts.map(({id, name, transaction, partner, imei}) => (
          <TableRow key={id}>
            <TableCell className="font-medium">{name}</TableCell>
            <TableCell>{partner?.name ?? 'N/A'}</TableCell>
            <TableCell>{partner?.phone ?? 'N/A'}</TableCell>
            <TableCell>{transaction ? format(new Date(transaction.date), "MMM d, yyyy") : 'N/A'}</TableCell>
            <TableCell className="font-mono text-xs">{imei}</TableCell>
            <TableCell className="text-right">
              ${transaction?.totalAmount.toFixed(2) ?? '0.00'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderLentBorrowedTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Partner Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Shop</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>IMEI</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProducts.map(({id, name, transaction, partner, imei}) => (
          <TableRow key={id}>
            <TableCell className="font-medium">{name}</TableCell>
            <TableCell>{partner?.name ?? 'N/A'}</TableCell>
            <TableCell>{partner?.phone ?? 'N/A'}</TableCell>
            <TableCell>{partner?.shopName ?? 'N/A'}</TableCell>
            <TableCell>{transaction ? format(new Date(transaction.date), "MMM d, yyyy") : 'N/A'}</TableCell>
            <TableCell className="font-mono text-xs">{imei}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );


  return (
    <>
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Inventory</h1>
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by IMEI..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
        </Button>
    </div>
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="sold">Sold</TabsTrigger>
        <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
        <TabsTrigger value="lent">Lent</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <Card>
          <CardHeader>
              <CardTitle>Active Products</CardTitle>
              <CardDescription>
                Manage your products and their stock levels.
              </CardDescription>
          </CardHeader>
          <CardContent>
            {renderActiveTable()}
            {filteredProducts.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No active products found.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="sold">
        <Card>
            <CardHeader>
                <CardTitle>Sold Products</CardTitle>
                <CardDescription>
                    A log of all products that have been sold.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderSoldTable()}
                 {filteredProducts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No sold products found.
                    </div>
                )}
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="borrowed">
        <Card>
            <CardHeader>
                <CardTitle>Borrowed Products</CardTitle>
                <CardDescription>
                    Products you have borrowed from partners.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderLentBorrowedTable()}
                {filteredProducts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No borrowed products found.
                    </div>
                )}
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="lent">
        <Card>
            <CardHeader>
                <CardTitle>Lent Products</CardTitle>
                <CardDescription>
                    Products you have lent out to partners.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderLentBorrowedTable()}
                {filteredProducts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No lent products found.
                    </div>
                )}
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Enter the details of the new product to add to your inventory.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="sku" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            SKU
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="individual" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Individual
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{productType === 'sku' ? 'Title of SKU' : 'Product Name'}</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Wireless Mouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                       <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Laptops">Laptops</SelectItem>
                          <SelectItem value="Mobiles">Mobiles</SelectItem>
                          <SelectItem value="Tablets">Tablets</SelectItem>
                          <SelectItem value="Chargers & Cables">Chargers & Cables</SelectItem>
                          <SelectItem value="Cases & Covers">Cases & Covers</SelectItem>
                          <SelectItem value="Audio">Audio</SelectItem>
                          <SelectItem value="Accessories">Accessories</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="imei"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMEI</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter IMEI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} disabled={productType === 'individual'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Add Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
