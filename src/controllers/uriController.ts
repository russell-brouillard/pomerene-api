import { Request, Response } from "express";
import { getCargo } from "../services/uri/uriService";

export const getCargoData = (req: Request, res: Response) => {
  const cargoData = getCargo();
  res.json(cargoData);
};
