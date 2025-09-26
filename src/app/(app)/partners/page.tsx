"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, MoreHorizontal, User, Building } from "lucide-react";

import { partners as initialPartners } from "@/lib/data";
import type { Partner } from "@/lib/types";
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

const partnerSchema = z.object({
  type: z.enum(["individual", "shop"]),
  name: z.string().min(1, "Partner name is required."),
  phone: z.string().min(1, "Phone number is required."),
  shopName: z.string().optional(),
}).refine(data => {
    if (data.type === 'shop') {
        return !!data.shopName && data.shopName.length > 0;
    }
    return true;
}, {
    message: "Shop name is required for shops.",
    path: ["shopName"],
});


export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof partnerSchema>>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      type: "individual",
      name: "",
      phone: "",
      shopName: "",
    },
  });
  
  const partnerType = form.watch("type");
  
  useEffect(() => {
    if (editingPartner) {
      form.reset({
        type: editingPartner.type,
        name: editingPartner.name,
        phone: editingPartner.phone,
        shopName: editingPartner.shopName || "",
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
  
  const confirmDelete = () => {
    if (partnerToDelete) {
      setPartners(partners.filter(p => p.id !== partnerToDelete.id));
      toast({
        title: "Partner Deleted",
        description: `${partnerToDelete.name} has been removed.`,
      });
    }
    setIsDeleteAlertOpen(false);
    setPartnerToDelete(null);
  }

  function onSubmit(values: z.infer<typeof partnerSchema>) {
    if (editingPartner) {
      const updatedPartners = partners.map(p => 
        p.id === editingPartner.id ? { ...p, ...values, shopName: values.type === 'shop' ? values.shopName : undefined } : p
      );
      setPartners(updatedPartners);
      toast({
        title: "Partner Updated",
        description: `${values.name} has been updated.`,
      });
    } else {
      const newPartner: Partner = {
        id: `partner-${Date.now()}`,
        ...values,
        shopName: values.type === 'shop' ? values.shopName : undefined,
      };
      setPartners([newPartner, ...partners]);
      toast({
        title: "Partner Added",
        description: `${values.name} has been added to your partners list.`,
      });
    }
    setIsDialogOpen(false);
    setEditingPartner(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Partners</h1>
          <Button onClick={handleAddNew} size="sm">
            <PlusCircle className="mr-2" />
            Add Partner
          </Button>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Partners List</CardTitle>
            <CardDescription>
              Manage your suppliers, customers, and other partners.
            </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shop Name</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      <Badge variant={partner.type === 'individual' ? 'secondary' : 'outline'} className="gap-1">
                        {partner.type === 'individual' ? <User className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                        <span className="capitalize">{partner.type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{partner.phone}</TableCell>
                    <TableCell>{partner.shopName ?? 'N/A'}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(partner)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(partner)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingPartner(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add New Partner'}</DialogTitle>
            <DialogDescription>
              {editingPartner ? 'Update the details for your partner.' : 'Enter the details for your new partner.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
                        className="flex items-center space-x-4"
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
                            Shop
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
              
              {partnerType === 'shop' && (
                <FormField
                  control={form.control}
                  name="shopName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name</FormLabel>
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
                <Button type="submit">{editingPartner ? 'Save Changes' : 'Add Partner'}</Button>
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
              This action cannot be undone. This will permanently delete the partner
              "{partnerToDelete?.name}" from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPartnerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
