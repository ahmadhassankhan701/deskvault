"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, MoreHorizontal, User, Building } from "lucide-react";

// NOTE: We now import the Partner type from the API route for consistency.
import { Partner } from "@/app/api/partners/route";
// NOTE: Assuming useData is no longer needed for partners state:
// import { useData } from "@/context/data-context";

// UI Components (assuming these are defined elsewhere in your project)
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define the validation schema (unchanged)
const partnerSchema = z
  .object({
    type: z.enum(["individual", "shop"]),
    name: z.string().min(1, "Partner name is required."),
    phone: z.string().min(1, "Phone number is required."),
    shopName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "shop") {
        return !!data.shopName && data.shopName.length > 0;
      }
      return true;
    },
    {
      message: "Shop name is required for shops.",
      path: ["shopName"],
    }
  );

type PartnerFormValues = z.infer<typeof partnerSchema>;

export default function PartnersPage() {
  // We manage partners state locally now
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // State to trigger a refetch after a successful mutation (add, edit, delete)
  const [needsRefresh, setNeedsRefresh] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const { toast } = useToast();

  const form = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      type: "individual",
      name: "",
      phone: "",
      shopName: "",
    },
  });

  const partnerType = form.watch("type");

  // Central function to fetch partners from the API
  const fetchPartners = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/partners");
      if (!response.ok) {
        throw new Error("Failed to fetch partners.");
      }
      const data = await response.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({
        title: "Error",
        description:
          "Could not load partners data from the server. Check your API routes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setNeedsRefresh(false);
    }
  }, [toast]);

  // Effect to load partners on component mount or when a refresh is needed
  useEffect(() => {
    if (needsRefresh) {
      fetchPartners();
    }
  }, [fetchPartners, needsRefresh]);

  // Effect to reset form when editingPartner changes
  useEffect(() => {
    if (editingPartner) {
      form.reset({
        type: editingPartner.type,
        name: editingPartner.name,
        phone: editingPartner.phone,
        shopName: editingPartner.shop_name || "",
      });
    } else {
      form.reset({
        type: "individual",
        name: "",
        phone: "",
        shopName: "",
      });
    }
  }, [editingPartner, form]);

  const handleAddNew = () => {
    setEditingPartner(null);
    form.reset({ type: "individual", name: "", phone: "", shopName: "" }); // Reset form completely
    setIsDialogOpen(true);
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setIsDialogOpen(true);
  };

  const handleDelete = (partner: Partner) => {
    setPartnerToDelete(partner);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!partnerToDelete) return;

    try {
      // FIX: Use query parameter (?id=) instead of path segment (/id)
      const response = await fetch(`/api/partners?id=${partnerToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete partner.");
      }

      toast({
        title: "Partner Deleted",
        description: `${partnerToDelete.name} has been removed permanently.`,
      });
      setNeedsRefresh(true); // Request a refresh of the partner list
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Deletion Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteAlertOpen(false);
      setPartnerToDelete(null);
    }
  };

  async function onSubmit(values: PartnerFormValues) {
    const isEditing = !!editingPartner;

    // FIX: Use query parameter (?id=) for PUT requests
    const url = isEditing
      ? `/api/partners?id=${editingPartner!.id}`
      : "/api/partners";

    const method = isEditing ? "PUT" : "POST";

    try {
      // Ensure shopName is only sent if type is 'shop'
      const payload = {
        ...values,
        shopName: values.type === "shop" ? values.shopName : null,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Attempt to read the error message as JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Failed to ${isEditing ? "update" : "add"} partner.`
          );
        } else {
          // Fallback for unexpected non-JSON (like HTML error page)
          const errorText = await response.text();
          console.error("Non-JSON Server Error Response:", errorText);
          throw new Error(
            `Server returned a non-JSON error. Status: ${response.status}. Check server logs for details.`
          );
        }
      }

      toast({
        title: isEditing ? "Partner Updated" : "Partner Added",
        description: `${values.name} has been ${
          isEditing ? "updated" : "added"
        } successfully.`,
      });
      setNeedsRefresh(true); // Request a refresh
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: isEditing ? "Update Failed" : "Addition Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsDialogOpen(false);
      setEditingPartner(null);
      // Removed form.reset() here to avoid race condition with needsRefresh
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Partners Management
        </h1>
        <Button onClick={handleAddNew} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Partners List</CardTitle>
          <CardDescription>
            Manage your suppliers, customers, and other partners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-blue-500 font-medium">
              Loading partners...
            </div>
          ) : partners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No partners found. Click "Add Partner" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">
                      Partner Name
                    </TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="min-w-[150px]">Phone</TableHead>
                    <TableHead className="min-w-[180px]">
                      Shop/Company Name
                    </TableHead>
                    <TableHead className="w-16">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner) => (
                    <TableRow
                      key={partner.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {partner.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            partner.type === "individual"
                              ? "secondary"
                              : "outline"
                          }
                          className="gap-1 px-2 py-1 text-xs font-semibold"
                        >
                          {partner.type === "individual" ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Building className="h-3 w-3" />
                          )}
                          <span className="capitalize">{partner.type}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{partner.phone}</TableCell>
                      <TableCell>
                        {partner.shop_name ?? (
                          <span className="text-gray-500 italic">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(partner)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(partner)}
                              className="text-red-600 focus:text-red-700"
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
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setEditingPartner(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? "Edit Partner" : "Add New Partner"}
            </DialogTitle>
            <DialogDescription>
              {editingPartner
                ? "Update the details for your partner."
                : "Enter the details for your new partner."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-6 py-4"
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Partner Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center space-x-6"
                        disabled={!!editingPartner}
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="individual" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Individual
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="shop" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Shop/Company
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 555-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {partnerType === "shop" && (
                <FormField
                  control={form.control}
                  name="shopName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop/Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Innovate LLC" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Saving..."
                    : editingPartner
                    ? "Save Changes"
                    : "Add Partner"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              partner "
              <span className="font-semibold">{partnerToDelete?.name}</span>"
              from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPartnerToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
