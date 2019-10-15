/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/**
 * Write your transction processor functions here
 */

/**
 * Buyer make decision
 * @param {org.example.yunzhong.makeDecision} d
 * @transaction
 */

const NS = 'org.example.yunzhong.';

async function makedecision(d) {
    const agreement = d.agreement;
    const buyer = d.buyer;

    buyer.agreement = agreement;

    const buyerRegistry = await getParticipantRegistry(NS+'Buyer');

    await buyerRegistry.update(buyer); 

}

/**
 * Seller initializing PI 
 * with basic information : address, paymentterm, deliver date, pi number
 * @param {org.example.yunzhong.initializePI} pi
 * @transaction
 */

async function initializePI(pi){
    
    // create new PI and assign value into it. 

    var newPI = getFactory().newResource('org.example.yunzhong', 'PI',  pi.piNumber);

    const toAddress = pi.buyer.companyAddress; 

    newPI.toAddress = toAddress;

    newPI.deliverDate = pi.deliverDate;

    newPI.dowmPayment=pi.dowmPayment;
  
   newPI.products = [];
  
   newPI.totalCost = 0;
   
   newPI.totalDownpayment = 0; 
    
    // assign newPI into seller. 

    pi.seller.pi=newPI;

    // add new PI and update seller's status 
    
    const piRegistry = await getAssetRegistry(NS+'PI');

    await piRegistry.add(newPI);

    const sellerRegistry = await getParticipantRegistry(NS+'Seller');

    await sellerRegistry.update(pi.seller);

}

/**
 * Adding products into accoding pi 
 * with basic information : address, paymentterm, deliver date, pi number
 * @param {org.example.yunzhong.addProductsToPI} p
 * @transaction
 */
async function addProductsToPI(p){

    const newProduct = p.product;
    
    const seller = p.seller;
     
    var products = p.pi.products;
    
    const totalCost = p.pi.totalCost;
    
    if(!products){
       
        products = []; 
    
    }
    
    products.push(newProduct);
    
    //calculate totalCost
    p.pi.totalCost = totalCost+newProduct.unitPrice * newProduct.qty;
    
    // calculate downpayment
    if(p.pi.dowmPayment = "tenPercent"){
       p.pi.totalDownpayment = p.pi.totalCost * 0.1
    } else if (p.pi.dowmPayment = "thirtyPercent"){
       p.pi.totalDownpayment = p.pi.totalCost * 0.3
    }else if(p.pi.dowmPayment = "half"){
        p.pi.totalDownpayment = p.pi.totalCost * 0.5
    }else{
        p.pi.totalDownpayment = p.pi.totalCost
    }
    // assign new pi to seller 
    seller.pi = p.pi;
    
    // update pi 
    const piRegistry = await getAssetRegistry(NS+'PI');
    
    await piRegistry.update(p.pi);
      
    const sellerRegistry = await getParticipantRegistry(NS+'Seller');
    
    await sellerRegistry.update(seller);
    
    }
    
/**
 * Adding products into accoding pi 
 * with basic information : address, paymentterm, deliver date, pi number
 * @param {org.example.yunzhong.sendPI} s
 * @transaction
 */
async function sendPI(s){

    const buyer = s.buyer
    const seller = s.seller
   
   //assign assign seller's pi into buyer
    buyer.pi = seller.pi
    buyer.receiveDate = s.timestamp

    //update buyer status 
    const buyerRegistry = await getParticipantRegistry(NS+'Buyer');
    await buyerRegistry.update(buyer);
}

/**
 * Adding products into accoding pi 
 * with basic information : address, paymentterm, deliver date, pi number
 * @param {org.example.yunzhong.addBankInformationToPI} a
 * @transaction
 */
async function addBankInformationToPI(a){

    const pi = a.pi
    const bankInfo = a.bankInformation

    //assign new bankInformation into pi
    pi.bankInformation = a.bankInformation
    
    const piRegistry=await getAssetRegistry(NS+'PI');
    await piRegistry.update(pi);

}

/**
 * Buyer make decision based on PI 
 * Result can be "agree" or "disgree"
 * @param {org.example.yunzhong.makeDecision } m
 * @transaction
 */
async function makeDecision(m){
    const decision = m.agreement
    const buyer =m.buyer
    const seller = m.seller
    const pi=m.pi;
   
    if(decision =="agreed"){
      
       seller.buyerStatus="agreed";
       buyer.agreement="agreed"
       pi.PIstatus = "validate"
       pi.validatePIdate=m.timestamp;
   
    }else{  
       buyer.pi=null 
       buyer.receiveDate = null
    }
    
    const piRegistry=await getAssetRegistry(NS+'PI');
    await piRegistry.update(pi)
   
    const buyerRegistry=await getParticipantRegistry(NS+'Buyer')
    await buyerRegistry.update(buyer)
   
    const sellerRegistry=await getParticipantRegistry(NS+'Seller')
    await sellerRegistry.update(seller);
   
   }

   /**
 * Transfer down payment
 * @param {org.example.yunzhong.transDownpayment} t
 * @transaction
 */
async function transDownpayment(t){

    const buyer = t.buyer
    const seller = t.seller
    const pi = t.pi
    const downPayment = t.downPayment

    if(pi.PIstatus !== "validate"){
        throw new Error ("PI is not a validate PI")
    }

    if(downPayment < pi.totalDownpayment){
        seller.score = seller.score -5 
        //throw new Error ("payment will not go through. Please pay total down payment.")   
    }else{
        pi.totalCost=pi.totalCost - downPayment
        pi.totalDownpayment = null 
        pi.downPaymentClearDate = t.timestamp
    }
   
    const piRegistry=await getAssetRegistry(NS+'PI');
    await piRegistry.update(pi)
   
    const buyerRegistry=await getParticipantRegistry(NS+'Buyer')
    await buyerRegistry.update(buyer)
   
    const sellerRegistry=await getParticipantRegistry(NS+'Seller')
    await sellerRegistry.update(seller);
   


}


