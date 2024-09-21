import { ProductsService } from 'src/app/services/products.service';
import { Inventory, Variant, Size } from './../../../models/inventory.model';
import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from 'src/app/models/product.model';
import { CartItem } from 'src/app/models/shoppingcart.model';
import { AuthService } from 'src/app/services/auth.service';
import { InventoryService } from 'src/app/services/inventory.service';
import { ShoppingCartService } from 'src/app/services/shoppingcart.service';

@Component({
  selector: 'app-item',
  templateUrl: './item.component.html',
  styleUrls: ['./item.component.scss']
})
export class ItemComponent implements OnInit {
  product: Product;
  inventory: Inventory;
  variants: Variant[] = [];
  sizesForSet: Size[] = [];
  selectedVariant: Variant | null = null;
  selectedSetSize: Size | null = null;
  maxQuantity = 0;
  quantity = 1;

  constructor(
    private inventoryService: InventoryService,
    private route: ActivatedRoute,
    private productService: ProductsService,
    private shoppingCartService: ShoppingCartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getProductCodeFromRoute();
  }

  getProductCodeFromRoute(): void {
    this.route.params.subscribe(params => {
      const code = params['code'];
      if (code) {
        this.getProductByCode(code)
        this.getInventoryItemByCode(code); // Fetch the product by code
      }
    });
  }

  getProductByCode(code: string): void {
    this.productService.getProductByCode(code).subscribe(data => {
      this.product = data;
    });
  }

  getInventoryItemByCode(code: string){
    this.inventoryService.getInventoryByProductCode(code).subscribe(data => {
      if (data) {
        this.inventory = data;
        this.getInventoryItems();
        console.log(this.inventory)
        if (this.variants.length > 0) {
          this.selectVariant(this.variants[0])
          if (this.selectedVariant.sizes && this.selectedVariant.sizes.length > 0) {
            this.selectSetSize(this.selectedVariant.sizes[0]);
          }
        }
      } else {
        console.warn('No inventory found.');
      }
    });
  }

  getInventoryItems() {
    if (this.inventory.variants) {
      this.variants = [...this.inventory.variants];
  
      // Check if any variant has sizes
      const hasSizes = this.variants.some(variant => variant.sizes && variant.sizes.length > 0);
  
      if (this.inventory.isSet && hasSizes) {
        this.createSizesForSet();
        this.variants.push({
          code: 'SET',
          name: 'Set' ,
          price: this.product.price,
          sizes: this.sizesForSet 
        } as Variant);
      } else if (this.inventory.isSet && !hasSizes) {
        const minQuantity = Math.min(...this.variants.map(variant => variant.quantity || Infinity));
        
        this.variants.push({
          code: 'SET',
          name: 'Set',
          price: this.product.price,
          quantity: minQuantity === Infinity ? 0 : minQuantity 
        } as Variant);
      }
    }
  }


  createSizesForSet() {
    if (this.inventory.isSet && this.inventory.variants) {
      const sizeMap: { [sizeName: string]: number } = {};
  
      this.inventory.variants.forEach(variant => {
        variant.sizes?.forEach(size => {
          const sizeName = size.size; 
          const quantity = size.quantity === undefined || size.quantity === null ? 0 : size.quantity;
  
          if (sizeMap[sizeName] === undefined) {
            sizeMap[sizeName] = quantity;
          } else {
            sizeMap[sizeName] = Math.min(sizeMap[sizeName], quantity);
          }
        });
      });

      this.sizesForSet = Object.keys(sizeMap).map(sizeName => ({
        size: sizeName, 
        quantity: sizeMap[sizeName]
      })) as Size[];
    }

  }

  selectSetSize(size: any): void {
    this.selectedSetSize = size;
    this.maxQuantity = size.quantity;
    if(this.maxQuantity==0){
      this.quantity = 0
    }else{
      this.quantity = 1; 
    }
  }
  
  selectVariant(variant: Variant) {
    this.selectedVariant = variant;
    console.log("selectedVariant", this.selectedVariant)
    if(!this.selectedSetSize){
      this.maxQuantity = variant.quantity;
      if(this.maxQuantity==0){
        this.quantity = 0
      }else{
        this.quantity = 1; 
      }
    }else{
      this.selectSetSize(this.selectedVariant.sizes[0])
    }
  }

  increaseQuantity(): void {
    if (this.quantity < this.maxQuantity) {
      this.quantity++;
    }
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  addToCart(): void {
    if (this.selectedVariant && this.maxQuantity>0) {
      const cartItem: CartItem = {
        idNo: this.authService.getUserIdNo(), // Replace with actual user ID
        orderDate: new Date().toISOString(), // Current date
        productCode: this.product.code,
        variantCode: this.selectedVariant.code,
        price: this.selectedVariant.price,
        quantity:  this.quantity,
        totalPrice: this.selectedVariant.price * this.quantity,
        imgURL: this.product.imageUrl || '',
        size: this.selectedSetSize ? this.selectedSetSize.size : '' ,
        name: this.selectedVariant.name === "Set" ? "Set - " + this.product.name : this.selectVariant.name
      };

      this.shoppingCartService.addToCart(cartItem);
      console.log('Item added to cart:', cartItem);
    } else {
      console.warn('Please select a variant and size before adding to cart.');
    }
  }

  
}

