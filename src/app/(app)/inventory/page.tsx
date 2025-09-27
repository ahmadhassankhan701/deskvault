"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PlusCircle,
  Package,
  Search,
  User,
  Building,
  Phone,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

// Import types from the shared library
import type {
  Product,
  Transaction,
  Partner,
  EnrichedProduct,
  EnrichedTransaction,
} from "@/lib/types";

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
  FormDescription,
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

// --- Zod Schemas ---

const productSchema = z
  .object({
    type: z.enum(["individual", "sku"]),
    name: z.string().min(1, "Product name is required."),
    category: z.string().min(1, "Category is required."),
    price: z.coerce.number().min(0, "Cost Price cannot be negative."),
    stock: z.coerce.number().int().min(0, "Stock cannot be negative."),
    imei: z.string().optional(),
    lentTo: z.string().optional(), // Partner Name for lend-out tracking
  })
  .refine(
    (data) => {
      // Custom refinement for 'individual' product type
      if (data.type === "individual") {
        return data.stock === 1;
      }
      return true;
    },
    {
      message: "Stock must be 1 for individual products.",
      path: ["stock"],
    }
  );

const saleSchema = z.object({
  buyerName: z.string().min(1, "Buyer name is required."),
  buyerPhone: z.string().min(1, "Buyer phone is required."),
  sellingPrice: z.coerce.number().min(0.01, "Selling price must be positive."),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1."),
});

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // --- Data Fetching and State Management ---

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productRes, transactionRes, partnerRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/transactions"),
        fetch("/api/partners"),
      ]);

      const productData = await productRes.json();
      setProducts(productData.products || []);

      const transactionData = await transactionRes.json();
      setTransactions(transactionData.transactions || []);

      const partnerData = await partnerRes.json();
      setPartners(partnerData.partners || []);
    } catch (error) {
      console.error("Inventory Data Fetch Error:", error);
      toast({
        title: "Data Error",
        description:
          "Failed to load inventory, transactions, or partners data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Helper to add a partner if not exists (used during sale submission)
  const addPartnerIfNotExist = async (name: string, phone: string) => {
    const existingPartner = partners.find(
      (p) => p.name === name || p.phone === phone
    );
    if (existingPartner) return existingPartner;

    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Default to 'individual' type, assuming a sale to an unknown buyer
        body: JSON.stringify({ name, phone, type: "individual" }),
      });
      const result = await res.json();
      if (res.ok) {
        const newPartner: Partner = {
          id: result.id,
          name,
          phone,
          type: "individual",
          created_at: new Date().toISOString(),
        };
        setPartners((prev) => [...prev, newPartner]);
        return newPartner;
      } else {
        throw new Error(result.message || "Failed to create new partner.");
      }
    } catch (error) {
      console.error("Partner creation error:", error);
      toast({
        title: "Partner Error",
        description: "Failed to create new partner.",
        variant: "destructive",
      });
      return null;
    }
  };

  // --- Form Setup ---

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

  // Dynamic validation for sale quantity based on stock
  const saleFormWithStockValidation = saleSchema.refine(
    (data) => {
      if (sellingProduct?.type === "sku") {
        return data.quantity <= (sellingProduct?.stock || 0);
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

  // Sync Form with Editing Product
  useEffect(() => {
    if (editingProduct) {
      const activeTransaction = transactions.find(
        (t) => t.productId === editingProduct.id && t.type === "lend-out"
      );

      productForm.reset({
        type: editingProduct.type,
        name: editingProduct.name,
        category: editingProduct.category,
        price: editingProduct.price,
        stock: editingProduct.stock,
        imei: editingProduct.imei,
        lentTo:
          activeTransaction?.type === "lend-out" ? activeTransaction.party : "",
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

  // Sync Sale Form with Selling Product
  useEffect(() => {
    if (sellingProduct) {
      saleFormValidated.reset({
        sellingPrice: sellingProduct.price, // Default selling price to cost price (can be changed by user)
        buyerName: "",
        buyerPhone: "",
        quantity: 1,
      });
    }
  }, [sellingProduct, saleFormValidated]);

  // Enforce 'individual' stock constraint on type change
  useEffect(() => {
    if (productType === "individual" && !editingProduct) {
      productForm.setValue("stock", 1);
    } else if (productType === "sku" && !editingProduct) {
      if (productForm.getValues("stock") === 1) {
        productForm.setValue("stock", 0);
      }
    }
  }, [productType, productForm, editingProduct]);

  // --- Data Filtering Logic ---

  const filteredProducts = useMemo(() => {
    const partnerMap = new Map(partners.map((p) => [p.name, p]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    if (activeTab === "active") {
      // 1. Filter out lent products
      const lentOutProductIds = new Set(
        transactions
          .filter((t) => t.type === "lend-out")
          .map((t) => t.productId)
      );
      let activeProducts = products.filter(
        (p) => p.stock > 0 && !lentOutProductIds.has(p.id)
      );

      // 2. Apply search filter
      if (searchTerm) {
        activeProducts = activeProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.imei && p.imei.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      return activeProducts;
    }

    if (activeTab === "sold") {
      // 1. Get all sale transactions
      let soldTransactions = transactions
        .filter((t) => t.type === "sale")
        .map((t) => {
          const product = productMap.get(t.productId);
          const partner = partnerMap.get(t.party);
          return { ...t, product, partner };
        })
        .filter((t): t is EnrichedTransaction => !!t.product); // Ensure product still exists

      // 2. Apply search filter
      if (searchTerm) {
        soldTransactions = soldTransactions.filter(
          (t) =>
            t.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.product?.imei &&
              t.product.imei.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      return soldTransactions;
    }

    if (activeTab === "lent") {
      // 1. Get all lend-out transactions and enrich with product/partner data
      let lentProducts: EnrichedProduct[] = transactions
        .filter((t) => t.type === "lend-out")
        .map((t) => {
          const product = productMap.get(t.productId);
          if (!product) return null;
          const partner = partnerMap.get(t.party);
          return { ...product, transaction: t, partner };
        })
        .filter((p): p is EnrichedProduct => p !== null);

      // 2. Apply search filter
      if (searchTerm) {
        lentProducts = lentProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.imei && p.imei.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      return lentProducts;
    }

    return [];
  }, [activeTab, searchTerm, products, transactions, partners]);

  // --- Handler Functions (API calls) ---

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

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const res = await fetch(`/api/products?id=${productToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Product Deleted",
          description: `${productToDelete.name} and its related data have been removed.`,
          variant: "destructive",
        });
        // Refresh all data to ensure state consistency
        fetchAllData();
      } else {
        const result = await res.json();
        throw new Error(result.message || "Failed to delete product.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        title: "Deletion Failed",
        description: "Could not remove the product. Check server logs.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setProductToDelete(null);
    }
  };

  const handleReturnLentItem = async (productId: string) => {
    const lentTransaction = transactions.find(
      (t) => t.productId === productId && t.type === "lend-out"
    );
    if (!lentTransaction) {
      return toast({
        title: "Error",
        description: "Lent item transaction not found.",
        variant: "destructive",
      });
    }

    try {
      // 1. Delete the lend-out transaction to mark it as returned/active
      const res = await fetch(`/api/transactions?id=${lentTransaction.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "Product Returned",
          description: "The product is now marked as active.",
        });
        // Optimistically remove the transaction from state
        setTransactions((prev) =>
          prev.filter((t) => t.id !== lentTransaction.id)
        );
      } else {
        const result = await res.json();
        throw new Error(
          result.message || "Failed to delete lend-out transaction."
        );
      }
    } catch (error) {
      console.error("Return failed:", error);
      toast({
        title: "Return Error",
        description: "Could not mark product as returned. Check server logs.",
        variant: "destructive",
      });
    }
  };

  async function onProductSubmit(values: z.infer<typeof productSchema>) {
    const isNewProduct = !editingProduct;
    let productId = editingProduct?.id;
    let newLentParty = values.lentTo;
    let oldLentTransaction: Transaction | undefined;

    try {
      // --- 1. HANDLE PRODUCT CRUD ---
      let productRes: Response;
      let method = isNewProduct ? "POST" : "PUT";
      let apiUrl = isNewProduct
        ? "/api/products"
        : `/api/products?id=${productId}`;

      if (!isNewProduct) {
        oldLentTransaction = transactions.find(
          (t) => t.productId === productId && t.type === "lend-out"
        );
      }

      const productPayload = {
        type: values.type,
        name: values.name,
        category: values.category,
        // Enforce stock=1 for individual products based on schema
        stock: values.type === "individual" ? 1 : values.stock,
        price: values.price,
        imei: values.imei,
      };

      productRes = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload),
      });

      const productResult = await productRes.json();
      if (!productRes.ok) {
        throw new Error(
          productResult.message ||
            `Failed to ${isNewProduct ? "add" : "update"} product.`
        );
      }

      if (isNewProduct) {
        productId = productResult.id;
      }

      // --- 2. HANDLE LEND-OUT TRANSACTION UPDATES (Only if product is individual/unique) ---

      if (values.type === "individual" && productId) {
        // Scenario 1: Product was lent, now it's not (or lent to someone else)
        if (oldLentTransaction && oldLentTransaction.party !== newLentParty) {
          const deleteRes = await fetch(
            `/api/transactions?id=${oldLentTransaction.id}`,
            { method: "DELETE" }
          );
          if (!deleteRes.ok)
            throw new Error("Failed to remove old lend-out transaction.");
          // Optimistically remove
          setTransactions((prev) =>
            prev.filter((t) => t.id !== oldLentTransaction!.id)
          );
        }

        // Scenario 2: Product is newly lent or lent to a different partner
        if (
          newLentParty &&
          (!oldLentTransaction || oldLentTransaction.party !== newLentParty)
        ) {
          // Ensure partner exists before creating transaction
          const partner = await addPartnerIfNotExist(
            newLentParty,
            "0000000000"
          );
          if (!partner)
            throw new Error("Could not log lend-out due to partner error.");

          const transactionPayload = {
            productId: productId,
            type: "lend-out",
            quantity: 1,
            price: 0,
            totalAmount: 0,
            date: new Date().toISOString(),
            party: newLentParty,
          };

          const txRes = await fetch("/api/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transactionPayload),
          });
          const txResult = await txRes.json();
          if (!txRes.ok)
            throw new Error(
              txResult.message || "Failed to create new lend-out transaction."
            );

          // Optimistically update state
          setTransactions((prev) => [
            ...prev.filter((t) => t.id !== oldLentTransaction?.id),
            { ...transactionPayload, id: txResult.id } as Transaction,
          ]);
          toast({
            title: "Product Lent",
            description: `Logged lend-out for ${values.name} to ${newLentParty}.`,
          });
        }
      }

      // --- 3. FINAL STATE UPDATE & TOAST ---
      toast({
        title: isNewProduct ? "Product Added" : "Product Updated",
        description: `${values.name} has been ${
          isNewProduct ? "added" : "updated"
        }.`,
      });

      // Full refresh is safer after complex operations affecting multiple tables
      fetchAllData();

      setIsProductDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      const err = error as Error;
      console.error("Product submission failed:", err);
      toast({
        title: "Submission Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  }

  async function onSaleSubmit(values: z.infer<typeof saleSchema>) {
    if (!sellingProduct) return;

    try {
      // --- 1. ENSURE PARTNER EXISTS ---
      const partner = await addPartnerIfNotExist(
        values.buyerName,
        values.buyerPhone
      );
      if (!partner) return;

      const quantitySold =
        sellingProduct.type === "individual" ? 1 : values.quantity;
      const totalAmount = values.sellingPrice * quantitySold;

      if (sellingProduct.stock < quantitySold) {
        toast({
          title: "Sale Error",
          description: "Stock check failed. Not enough units available.",
          variant: "destructive",
        });
        return;
      }

      // --- 2. LOG TRANSACTION ---
      const transactionPayload = {
        productId: sellingProduct.id,
        type: "sale",
        quantity: quantitySold,
        price: values.sellingPrice,
        totalAmount: totalAmount,
        date: new Date().toISOString(),
        party: partner.name,
      };

      const txRes = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionPayload),
      });
      const txResult = await txRes.json();
      if (!txRes.ok) {
        throw new Error(
          txResult.message || "Failed to record sale transaction."
        );
      }

      // --- 3. UPDATE PRODUCT STOCK ---
      const newStock = sellingProduct.stock - quantitySold;
      const stockUpdatePayload = {
        name: sellingProduct.name,
        type: sellingProduct.type,
        category: sellingProduct.category,
        price: sellingProduct.price,
        imei: sellingProduct.imei,
        stock: newStock,
      };

      const productUpdateRes = await fetch(
        `/api/products?id=${sellingProduct.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stockUpdatePayload),
        }
      );

      if (!productUpdateRes.ok) {
        throw new Error("Failed to update product stock after sale.");
      }

      // --- 4. FINAL STATE UPDATE & TOAST ---
      toast({
        title: "Product Sold!",
        description: `${sellingProduct.name} (x${quantitySold}) sold to ${partner.name}.`,
      });

      // Full refresh is safest after a sale that impacts two tables
      fetchAllData();

      setIsSaleDialogOpen(false);
      setSellingProduct(null);
    } catch (error) {
      const err = error as Error;
      console.error("Sale failed:", err);
      toast({
        title: "Sale Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  }

  // --- Utility Renderers ---

  const getStockStatus = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock < 10 && stock > 0)
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
        >
          Low Stock
        </Badge>
      );
    return <Badge variant="secondary">In Stock</Badge>;
  };

  // Renders partner details for Lent tab
  const PartnerCell = ({ partner }: { partner?: Partner }) => {
    if (!partner)
      return (
        <TableCell className="text-muted-foreground">N/A (Deleted)</TableCell>
      );

    const initials = partner.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    return (
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{partner.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {partner.type === "shop" ? (
                <Building className="h-3 w-3" />
              ) : (
                <User className="h-3 w-3" />
              )}
              <span>{partner.shop_name ?? "Individual"}</span>
            </div>
          </div>
        </div>
      </TableCell>
    );
  };

  // Renders buyer details for Sold tab
  const SoldToCell = ({ partner }: { partner?: Partner }) => {
    if (!partner)
      return (
        <TableCell className="text-muted-foreground">N/A (Deleted)</TableCell>
      );

    const initials = partner.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    return (
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{partner.name}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
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
          <TableHead>Cost Price</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(filteredProducts as Product[]).map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <Badge
                variant={
                  product.type === "individual" ? "outline" : "secondary"
                }
                className="gap-1 capitalize"
              >
                <Package className="h-3 w-3" />
                {product.type}
              </Badge>
            </TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>{product.stock}</TableCell>
            <TableCell>${product.price.toFixed(2)}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {product.imei || "-"}
            </TableCell>
            <TableCell>{getStockStatus(product.stock)}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleSell(product)}
                    disabled={product.stock === 0}
                  >
                    Sell
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleEdit(product)}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(product)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
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
      if (profit > 0) return "text-green-600 font-semibold";
      if (profit < 0) return "text-red-600 font-semibold";
      return "text-muted-foreground";
    };

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Type/Qty</TableHead>
            <TableHead>Sold To</TableHead>
            <TableHead>Selling Date</TableHead>
            <TableHead>IMEI</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Total Revenue</TableHead>
            <TableHead className="text-right">Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(filteredProducts as EnrichedTransaction[]).map((t) => {
            if (!t.product) return null;

            const quantity = t.quantity;
            const totalSoldPrice = t.totalAmount;
            const totalPurchasePrice = (t.product.price || 0) * quantity;
            const profit = totalSoldPrice - totalPurchasePrice;

            return (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.product.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      t.product.type === "individual" ? "outline" : "secondary"
                    }
                    className="gap-1 capitalize"
                  >
                    {t.product.type} (x{t.quantity})
                  </Badge>
                </TableCell>
                <SoldToCell partner={t.partner} />
                <TableCell>
                  {format(new Date(t.date), "MMM d, yyyy, h:mm a")}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {t.product.imei || "-"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ${totalPurchasePrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-medium text-blue-600">
                  ${totalSoldPrice.toFixed(2)}
                </TableCell>
                <TableCell
                  className={`text-right ${getProfitClassName(profit)}`}
                >
                  ${profit.toFixed(2)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderLentTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product Name</TableHead>
          <TableHead>Partner</TableHead>
          <TableHead>Lent Date</TableHead>
          <TableHead>IMEI</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(filteredProducts as EnrichedProduct[]).map(
          ({ id, name, transaction, partner, imei }) => (
            <TableRow key={id}>
              <TableCell className="font-medium">{name}</TableCell>
              <PartnerCell partner={partner} />
              <TableCell>
                {transaction
                  ? format(new Date(transaction.date), "MMM d, yyyy, h:mm a")
                  : "N/A"}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {imei || "-"}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReturnLentItem(id)}
                >
                  Mark as Active
                </Button>
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-gray-800">
              Inventory Management
            </h1>
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
          <Button
            onClick={handleAddNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 transition-colors"
          >
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
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active Products in Stock</CardTitle>
                <CardDescription>
                  Products currently available for sale or lending.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-blue-500 flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading active
                    inventory...
                  </div>
                ) : filteredProducts.length > 0 ? (
                  renderActiveTable()
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No active products found matching your criteria.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sold">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Sold Products Log</CardTitle>
                <CardDescription>
                  A log of all products that have been sold and the profit
                  realized.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-blue-500 flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading sales
                    history...
                  </div>
                ) : filteredProducts.length > 0 ? (
                  renderSoldTable()
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No sold products found.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="lent">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Lent Products Tracker</CardTitle>
                <CardDescription>
                  Products currently lent out to partners.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-blue-500 flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading lent
                    products...
                  </div>
                ) : filteredProducts.length > 0 ? (
                  renderLentTable()
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No lent products found.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Product Add/Edit Dialog */}
        <Dialog
          open={isProductDialogOpen}
          onOpenChange={(isOpen) => {
            setIsProductDialogOpen(isOpen);
            if (!isOpen) {
              setEditingProduct(null);
              productForm.reset();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the details of your product."
                  : "Enter the details of the new product to add to your inventory."}
              </DialogDescription>
            </DialogHeader>
            <Form {...productForm}>
              <form
                onSubmit={productForm.handleSubmit(onProductSubmit)}
                className="space-y-4"
              >
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
                              SKU (Stackable)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="individual" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Individual (Unique)
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
                        <FormLabel>
                          {productType === "sku"
                            ? "Title of SKU"
                            : "Product Name"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Wireless Mouse"
                            {...field}
                          />
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
                            <SelectItem value="Chargers & Cables">
                              Chargers & Cables
                            </SelectItem>
                            <SelectItem value="Cases & Covers">
                              Cases & Covers
                            </SelectItem>
                            <SelectItem value="Audio">Audio</SelectItem>
                            <SelectItem value="Accessories">
                              Accessories
                            </SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
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
                      <FormLabel>IMEI / Serial Number</FormLabel>
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
                        <FormLabel>Cost Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
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
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            disabled={productType === "individual"}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
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
                        <FormLabel>Lent to Partner</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* Option to clear lend-out status */}
                            <SelectItem value="">None</SelectItem>
                            {/* List of existing partners */}
                            {partners.map((p) => (
                              <SelectItem key={p.id} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Only applicable to Individual products.
                        </FormDescription>
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
                  <Button type="submit">
                    {editingProduct ? "Save Changes" : "Add Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Sale Dialog */}
        <Dialog
          open={isSaleDialogOpen}
          onOpenChange={(isOpen) => {
            setIsSaleDialogOpen(isOpen);
            if (!isOpen) {
              setSellingProduct(null);
              saleFormValidated.reset();
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sell Product</DialogTitle>
              <DialogDescription>
                Record a sale for "{sellingProduct?.name}". Current stock:{" "}
                {sellingProduct?.stock}.
              </DialogDescription>
            </DialogHeader>
            <Form {...saleFormValidated}>
              <form
                onSubmit={saleFormValidated.handleSubmit(onSaleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={saleFormValidated.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price (per unit)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {sellingProduct?.type === "sku" && (
                  <FormField
                    control={saleFormValidated.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity to Sell</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Max available: {sellingProduct.stock}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <h3 className="font-semibold pt-2 border-t mt-4">
                  Buyer Details
                </h3>

                <FormField
                  control={saleFormValidated.control}
                  name="buyerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buyer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">Complete Sale</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert */}
        <AlertDialog
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete
                <span className="font-semibold text-foreground">
                  {" "}
                  "{productToDelete?.name}"
                </span>
                and all its associated transaction history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive hover:bg-red-700"
              >
                Delete Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
