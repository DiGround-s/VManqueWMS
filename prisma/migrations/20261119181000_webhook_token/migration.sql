-- Token secreto en la URL del webhook (tiendas que no firman sus avisos)
ALTER TABLE "MarketplaceAccount" ADD COLUMN "webhookToken" TEXT;
