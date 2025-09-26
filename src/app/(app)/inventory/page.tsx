"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Package, Search, User, Building, Phone, MoreHorizontal } from "lucide-react";
import { format } from 'date-fns';

import { useData } from "@/context/data-context";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

const saleSchema = z.object({
  buyerName: z.string().min(1, "Buyer name is required."),
  buyerPhone: z.string().min(1, "Buyer phone is required."),
  sellingPrice: z.coerce.number().min(0.01, "Selling price must be positive."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
});


type EnrichedProduct = Product & { transaction?: Transaction, partner?: Partner };
type EnrichedTransaction = Transaction & { product: Product, partner?: Partner };

export default function InventoryPage() {
  const { products, setProducts, transactions, setTransactions, partners, addPartner, addProduct, addTransaction } = useData();

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const productForm = useForm<z.infer<typeof productSchema>>({
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

  const saleFormWithStockValidation = saleSchema.refine(
    (data) => {
      if (sellingProduct?.type === 'sku') {
        return data.quantity <= sellingProduct.stock;
      }
      return true;
    },
    {
      message: "Cannot sell more than available in stock.",
      path: ["quantity"],
    }
  );

  const saleFormValidated = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleFormWithStockValidation),
    defaultValues: {
      buyerName: "",
      buyerPhone: "",
      sellingPrice: 0,
      quantity: 1,
    },
  });
  
  const productType = productForm.watch("type");

  useEffect(() => {
    if (editingProduct) {
      const activeTransaction = transactions.find(t => t.productId === editingProduct.id && t.type === 'lend-out');
      
      productForm.reset({
        type: editingProduct.type,
        name: editingProduct.name,
        category: editingProduct.category,
        price: editingProduct.price,
        stock: editingProduct.stock,
        imei: editingProduct.imei,
        lentTo: activeTransaction?.type === 'lend-out' ? activeTransaction.party : "",
      });
    } else {
      productForm.reset({
        type: "sku",
        name: "",
        category: "",
        stock: 0,
        price: 0,
        imei: "",
        lentTo: "",
      });
    }
  }, [editingProduct, productForm, transactions]);

  useEffect(() => {
    if (sellingProduct) {
        saleFormValidated.reset({
            sellingPrice: sellingProduct.price,
            buyerName: "",
            buyerPhone: "",
            quantity: 1,
        });
    }
  }, [sellingProduct, saleFormValidated]);
  
  useEffect(() => {
    if (productType === "individual" && !editingProduct) {
      productForm.setValue("stock", 1);
    } else if (productType === "sku" && !editingProduct) {
        if (productForm.getValues("stock") === 1) {
            productForm.setValue("stock", 0);
        }
    }
  }, [productType, productForm, editingProduct]);

  const filteredProducts = useMemo(() => {
    const partnerMap = new Map(partners.map(p => [p.name, p]));
    const productMap = new Map(products.map(p => [p.id, p]));

    if (activeTab === 'active') {
        const lentOutProductIds = new Set(transactions.filter(t => t.type === 'lend-out').map(t => t.productId));
        let activeProducts = products.filter(p => p.stock > 0 && !lentOutProductIds.has(p.id));

        if (searchTerm) {
            activeProducts = activeProducts.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.imei && p.imei.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return activeProducts;
    }

    if (activeTab === 'sold') {
        let soldTransactions = transactions
            .filter(t => t.type === 'sale')
            .map(t => {
                const product = productMap.get(t.productId);
                if (!product) return null;
                const partner = partnerMap.get(t.party);
                return { ...t, product, partner };
            })
            .filter((t): t is EnrichedTransaction => t !== null && t.product !== undefined);

        if (searchTerm) {
            return soldTransactions.filter(t =>
                t.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.product.imei && t.product.imei.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return soldTransactions;
    }
    
    if (activeTab === 'lent') {
        const lentProducts: EnrichedProduct[] = transactions
            .filter(t => t.type === 'lend-out')
            .map(t => {
                const product = productMap.get(t.productId);
                if (!product) return null;
                const partner = partnerMap.get(t.party);
                return { ...product, transaction: t, partner };
            })
            .filter((p): p is EnrichedProduct => p !== null);
        
        if (searchTerm) {
            return lentProducts.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.imei && p.imei.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return lentProducts;
    }

    return [];
  }, [activeTab, searchTerm, products, transactions, partners]);
  
  const handleAddNew = () => {
    setEditingProduct(null);
    setIsProductDialogOpen(true);
  };
  
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleSell = (product: Product) => {
    setSellingProduct(product);
    setIsSaleDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      // Remove product
      setProducts(products.filter(p => p.id !== productToDelete.id));
      // Remove associated transactions
      setTransactions(transactions.filter(t => t.productId !== productToDelete.id));
      
      toast({
        title: "Product Deleted",
        description: `${productToDelete.name} and its transactions have been removed.`,
        variant: "destructive",
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

  function onProductSubmit(values: z.infer<typeof productSchema>) {
    const isNewProduct = !editingProduct;
    let productId = editingProduct ? editingProduct.id : `prod-${Date.now()}`;
    
    const existingLentTransaction = transactions.find(t => t.productId === productId && t.type === 'lend-out');
    if (existingLentTransaction && existingLentTransaction.party !== values.lentTo) {
        setTransactions(prev => prev.filter(t => t.id !== existingLentTransaction.id));
    }

    if (!isNewProduct && editingProduct) {
      const updatedProducts = products.map(p =>
        p.id === editingProduct.id ? { ...p, ...values, id: productId, imei: values.imei, stock: values.type === 'individual' ? 1 : values.stock } : p
      );
      setProducts(updatedProducts);
      toast({
        title: "Product Updated",
        description: `${values.name} has been updated.`,
      });
    } else {
       const newProduct = addProduct({
        ...values,
        stock: values.type === 'individual' ? 1 : values.stock,
      });
      productId = newProduct.id;
      toast({
        title: "Product Added",
        description: `${values.name} has been added to the inventory.`,
      });
    }
    
    if (values.lentTo && (!existingLentTransaction || existingLentTransaction.party !== values.lentTo)) {
        addTransaction({
            productId: productId,
            type: 'lend-out',
            quantity: 1,
            price: 0,
            totalAmount: 0,
            date: new Date().toISOString(),
            party: values.lentTo
        });
        toast({ title: "Product Lent", description: `Logged lend-out for ${values.name} to ${values.lentTo}.` });
    }

    setIsProductDialogOpen(false);
    setEditingProduct(null);
  }

  function onSaleSubmit(values: z.infer<typeof saleSchema>) {
    if (!sellingProduct) return;

    let partner = partners.find(p => p.name === values.buyerName && p.phone === values.buyerPhone);
    if (!partner) {
        partner = addPartner({
            name: values.buyerName,
            phone: values.buyerPhone,
            type: 'individual',
        });
    }
    
    const quantitySold = sellingProduct.type === 'individual' ? 1 : values.quantity;

    addTransaction({
        productId: sellingProduct.id,
        type: 'sale',
        quantity: quantitySold,
        price: values.sellingPrice,
        totalAmount: values.sellingPrice * quantitySold,
        date: new Date().toISOString(),
        party: partner.name,
    });

    setProducts(prev => prev.map(p => 
        p.id === sellingProduct.id 
        ? { ...p, stock: p.stock - quantitySold }
        : p
    ));

    toast({
        title: "Product Sold!",
        description: `${sellingProduct.name} sold to ${partner.name}.`,
    });
    
    setIsSaleDialogOpen(false);
    setSellingProduct(null);
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
        {(filteredProducts as Product[]).map((product) => (
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
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleSell(product)} disabled={product.stock === 0}>Sell</DropdownMenuItem>
                  <DropdownMenuSeparator />
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
           <TableHead>Type</TableHead>
          <TableHead>Sold To</TableHead>
          <TableHead>Selling Date</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead className="text-right">Purchase Price</TableHead>
          <TableHead className="text-right">Sold Price</TableHead>
          <TableHead className="text-right">Profit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(filteredProducts as EnrichedTransaction[]).map((t) => {
            const salePrice = t.price ?? 0;
            const quantity = t.quantity ?? 1;
            const purchasePrice = t.product.price;
            const profit = (salePrice - purchasePrice) * quantity;
            
            return (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.product.name}</TableCell>
                <TableCell>
                  <Badge variant={t.product.type === 'individual' ? 'outline' : 'secondary'} className="gap-1 capitalize">
                    <Package className="h-3 w-3" />
                    {t.product.type}
                  </Badge>
                </TableCell>
                <SoldToCell partner={t.partner} />
                <TableCell>{format(new Date(t.date), "MMM d, yyyy, h:mm a")}</TableCell>
                <TableCell className="font-mono text-xs">{t.product.imei}</TableCell>
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
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(filteredProducts as EnrichedProduct[]).map(({id, name, transaction, partner, imei}) => (
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
                    placeholder="Search by Name or IMEI..."
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

      <Dialog open={isProductDialogOpen} onOpenChange={(isOpen) => { setIsProductDialogOpen(isOpen); if (!isOpen) setEditingProduct(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update the details of your product.' : 'Enter the details of the new product to add to your inventory.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
              <FormField
                control={productForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center space-x-4"
                        disabled={!!editingProduct}
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
                  control={productForm.control}
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
                  control={productForm.control}
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
                control={productForm.control}
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
                  control={productForm.control}
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
                  control={productForm.control}
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
              
              <div className="grid grid-cols-1 gap-4">
                  <FormField
                      control={productForm.control}
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
      
      <Dialog open={isSaleDialogOpen} onOpenChange={(isOpen) => { setIsSaleDialogOpen(isOpen); if (!isOpen) setSellingProduct(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Sell Product</DialogTitle>
                <DialogDescription>
                    Record a sale for "{sellingProduct?.name}".
                </DialogDescription>
            </DialogHeader>
            <Form {...saleFormValidated}>
                <form onSubmit={saleFormValidated.handleSubmit(onSaleSubmit)} className="space-y-4">
                    <FormField
                        control={saleFormValidated.control}
                        name="buyerName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Buyer Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={saleFormValidated.control}
                        name="buyerPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Buyer Phone</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 555-123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={saleFormValidated.control}
                        name="sellingPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Selling Price (per item)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {sellingProduct?.type === 'sku' && (
                        <FormField
                            control={saleFormValidated.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                        <Input type="number" min={1} max={sellingProduct?.stock} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                        </DialogClose>
                        <Button type="submit">Confirm Sale</Button>
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
              "{productToDelete?.name}" from your inventory and all associated transactions.
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
