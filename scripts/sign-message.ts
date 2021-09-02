import fs from 'fs';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import PassReceiverData from '../data/pass-receiver-data.json';

interface PassReq {
  vSig: number;
  rSig: string;
  sSig: string;
  amount: number;
}

interface DomainType {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

const passReqMap: { [key: string]: PassReq } = {};

const signTypedData = async ({
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

const main = async () => {
  const [owner] = await ethers.getSigners();
  console.log('Signing message with the account:', owner.address);

  await Promise.all(
    Object.entries(PassReceiverData.receiverData).map(
      async ([receiver, amount]) => {
        const signature = await signTypedData({
          signer: owner,
          domain: PassReceiverData.domain,
          types: PassReceiverData.types,
          data: {
            receiver,
            amount,
          },
        });

        const { r, s, v } = ethers.utils.splitSignature(signature);

        passReqMap[receiver] = {
          rSig: r,
          sSig: s,
          vSig: v,
          amount,
        };
      }
    )
  );

  fs.writeFileSync('data/pass-signatures.json', JSON.stringify(passReqMap));
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
