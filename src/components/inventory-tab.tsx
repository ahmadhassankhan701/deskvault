"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Package, Search, User, Building, Phone, MoreHorizontal } from "lucide-react";
import { format } from 'date-fns';

import { products as initialProducts, transactions as initialTransactions, partners } from "@/lib/data";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Avatar, AvatarFallback } from "./ui/avatar";

const productSchema = z.object({
  type: z.enum(["individual", "sku"]),
  name: z.string().min(1, "Product name is required."),
  category: z.string().min(1, "Category is required."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative."),
  imei: z.string().optional(),
  lentTo: z.string().optional(),
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
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
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
      lentTo: "",
    },
  });
  
  const productType = form.watch("type");

  useEffect(() => {
    if (editingProduct) {
      const activeTransaction = transactions.find(t => t.productId === editingProduct.id && t.type === 'lend-out');
      
      form.reset({
        type: editingProduct.type,
        name: editingProduct.name,
        category: editingProduct.category,
        price: editingProduct.price,
        stock: editingProduct.stock,
        imei: editingProduct.imei,
        lentTo: activeTransaction?.type === 'lend-out' ? activeTransaction.party : "",
      });
    } else {
      form.reset({
        type: "sku",
        name: "",
        category: "",
        stock: 0,
        price: 0,
        imei: "",
        lentTo: "",
      });
    }
  }, [editingProduct, form, transactions]);
  
  useEffect(() => {
    if (productType === "individual") {
      form.setValue("stock", 1);
    } else {
      if (form.getValues("stock") === 1 && !editingProduct) {
          form.setValue("stock", 0);
      }
    }
  }, [productType, form, editingProduct]);

 const filteredProducts = useMemo((): EnrichedProduct[] => {
    const transactionMap = new Map<string, Transaction>();
    transactions.forEach(t => transactionMap.set(t.productId, t));
    
    const partnerMap = new Map<string, Partner>();
    partners.forEach(p => partnerMap.set(p.name, p));

    let tabProducts: Product[] = [];
    const sourceProducts = products;

    if (activeTab === 'active') {
        const productIdsInActiveTransactions = new Set(transactions
            .filter(t => ['sale', 'lend-out'].includes(t.type))
            .map(t => t.productId)
        );

        tabProducts = sourceProducts.filter(p => p.stock > 0 && !productIdsInActiveTransactions.has(p.id));

    } else {
        const relevantTxnTypes: string[] = {
            'sold': ['sale'],
            'lent': ['lend-out'],
        }[activeTab] || [];
        
        const productIdsInTransactions = new Set(transactions
            .filter(t => relevantTxnTypes.includes(t.type))
            .map(t => t.productId));
            
        tabProducts = sourceProducts.filter(p => productIdsInTransactions.has(p.id));
    }

    let enriched = tabProducts.map(p => {
        const transaction = transactions.find(t => t.productId === p.id && {
            'sold': t.type === 'sale',
            'lent': t.type === 'lend-out',
        }[activeTab]);
        const partner = transaction ? partnerMap.get(transaction.party) : undefined;
        return { ...p, transaction, partner };
    });

    if (!searchTerm) {
      return enriched;
    }

    return enriched.filter(product =>
      product.imei?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTab, searchTerm, products, transactions]);
  
  const handleAddNew = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      setProducts(products.filter(p => p.id !== productToDelete.id));
      toast({
        title: "Product Deleted",
        description: `${productToDelete.name} has been removed.`,
      });
    }
    setIsDeleteAlertOpen(false);
    setProductToDelete(null);
  }

  const handleReturnLentItem = (productId: string) => {
    setTransactions(prev => prev.filter(t => !(t.productId === productId && t.type === 'lend-out')));
    toast({
        title: "Product Returned",
        description: "The product is now marked as active.",
    });
  };

  function onSubmit(values: z.infer<typeof productSchema>) {
    const isNewProduct = !editingProduct;
    let productId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    
    // Remove any existing lend-out transaction for this product if there is a change.
    const existingLentTransaction = transactions.find(t => t.productId === productId && t.type === 'lend-out');
    if (existingLentTransaction && existingLentTransaction.party !== values.lentTo) {
        setTransactions(prev => prev.filter(t => t.id !== existingLentTransaction.id));
    }

    if (!isNewProduct) {
      const updatedProducts = products.map(p =>
        p.id === editingProduct.id ? { ...p, ...values, imei: values.imei, stock: values.type === 'individual' ? 1 : values.stock } : p
      );
      setProducts(updatedProducts);
      toast({
        title: "Product Updated",
        description: `${values.name} has been updated.`,
      });
    } else {
      const newProduct: Product = {
        id: productId,
        ...values,
        stock: values.type === 'individual' ? 1 : values.stock,
      };
      setProducts([newProduct, ...products]);
      toast({
        title: "Product Added",
        description: `${values.name} has been added to the inventory.`,
      });
    }
    
    // Create lend-out transaction if a partner is selected and no transaction exists yet.
    if (values.lentTo && (!existingLentTransaction || existingLentTransaction.party !== values.lentTo)) {
         const newTransaction: Transaction = {
            id: `txn-${Date.now()}`,
            productId: productId,
            type: 'lend-out',
            quantity: 1,
            price: 0,
            totalAmount: 0,
            date: new Date().toISOString(),
            party: values.lentTo
        };
        setTransactions(prev => [newTransaction, ...prev]);
        toast({ title: "Product Lent", description: `Logged lend-out for ${values.name} to ${values.lentTo}.` });
    }

    setIsDialogOpen(false);
    setEditingProduct(null);
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
  
  const PartnerCell = ({ partner }: { partner?: Partner }) => {
    if (!partner) return <TableCell>N/A</TableCell>;

    const initials = partner.name.split(' ').map(n => n[0]).join('');

    return (
        <TableCell>
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium">{partner.name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {partner.type === 'shop' ? <Building className="h-3 w-3"/> : <User className="h-3 w-3"/>}
                        <span>{partner.shopName ?? 'Individual'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3"/>
                        <span>{partner.phone}</span>
                    </div>
                </div>
            </div>
        </TableCell>
    );
};

const SoldToCell = ({ partner }: { partner?: Partner }) => {
    if (!partner) return <TableCell>N/A</TableCell>;

    const initials = partner.name.split(' ').map(n => n[0]).join('');

    return (
        <TableCell>
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium">{partner.name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3"/>
                        <span>{partner.phone}</span>
                    </div>
                </div>
            </div>
        </TableCell>
    );
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
          <TableHead><span className="sr-only">Actions</span></TableHead>
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
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(product)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(product)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderSoldTable = () => {
    const getProfitClassName = (profit: number) => {
        if (profit > 0) return 'text-green-600';
        if (profit < 0) return 'text-red-600';
        return 'text-muted-foreground';
    }
    
    return (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Sold To</TableHead>
          <TableHead>Selling Date</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead className="text-right">Purchase Price</TableHead>
          <TableHead className="text-right">Sold Price</TableHead>
          <TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProducts.map((p) => {
            const salePrice = p.transaction?.totalAmount ?? 0;
            const purchasePrice = p.price;
            const profit = salePrice - purchasePrice;
            
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <SoldToCell partner={p.partner} />
                <TableCell>{p.transaction ? format(new Date(p.transaction.date), "MMM d, yyyy, h:mm a") : 'N/A'}</TableCell>
                <TableCell className="font-mono text-xs">{p.imei}</TableCell>
                <TableCell className="text-right">
                  ${purchasePrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${salePrice.toFixed(2)}
                </TableCell>
                <TableCell className={`text-right font-medium ${getProfitClassName(profit)}`}>
                  ${profit.toFixed(2)}
                </TableCell>
              </TableRow>
            );
        })}
      </TableBody>
    </Table>
  )};

  const renderLentTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Partner</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredProducts.map(({id, name, transaction, partner, imei}) => (
          <TableRow key={id}>
            <TableCell className="font-medium">{name}</TableCell>
            <PartnerCell partner={partner} />
            <TableCell>{transaction ? format(new Date(transaction.date), "MMM d, yyyy, h:mm a") : 'N/A'}</TableCell>
            <TableCell className="font-mono text-xs">{imei}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => handleReturnLentItem(id)}>
                Mark as Active
              </Button>
            </TableCell>
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
        <Button onClick={handleAddNew} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Product
        </Button>
    </div>
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="sold">Sold</TabsTrigger>
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
      <TabsContent value="lent">
        <Card>
            <CardHeader>
                <CardTitle>Lent Products</CardTitle>
                <CardDescription>
                    Products you have lent out to partners.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderLentTable()}
                {filteredProducts.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                        No lent products found.
                    </div>
                )}
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingProduct(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the details of your product.' : 'Enter the details of the new product to add to your inventory.'}
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
                        value={field.value}
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
                        value={field.value}
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
              
              {productType === 'individual' && (
                <div className="grid grid-cols-1 gap-4">
                    <FormField
                        control={form.control}
                        name="lentTo"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lent to</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="None" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">{editingProduct ? 'Save Changes' : 'Add Product'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product
              "{productToDelete?.name}" from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
