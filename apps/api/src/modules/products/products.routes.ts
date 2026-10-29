import { Router } from "express";
import * as controller from "./products.controller";

export const productsRouter = Router();

productsRouter.get("/products", controller.list);
productsRouter.get("/products/:handle", controller.detail);
productsRouter.get("/collections", controller.collections);
productsRouter.get("/catalog/meta", controller.meta);
