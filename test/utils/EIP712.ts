import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Signature } from 'ethers';
import { ethers } from 'hardhat';

export interface UnitType {
  name: string;
  type: 'string' | 'uint256' | 'address';
}

export interface DomainType {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export const signTypedData = async ({
  signer,
  domain,
  types,
  data,
}: {
  signer: SignerWithAddress;
  domain: DomainType;
  types: any;
  data: any;
}): Promise<string> => {
  const signature = await signer._signTypedData(domain, types, data);

  return signature;
};

export const splitSignature = (signature: string): Signature => {
  return ethers.utils.splitSignature(signature);
};

export const recoverAddress = ({
  domain,
  types,
  message,
  signature,
}: {
  domain: DomainType;
  types: any;
  message: any;
  signature: string;
}): string => {
  return ethers.utils.verifyTypedData(domain, types, message, signature);
};
