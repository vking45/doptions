import { BrowserProvider, Contract, formatUnits } from 'ethers';
import { callOptionABI } from '@/web3/CallOptionABI';
import { optionFactoryABI } from '@/web3/OptionFactoryABI';
import { putOptionABI } from '@/web3/PutOptionABI';
import { erc20ABI } from '@/web3/ERC20ABI';
import { usdtMapping, amoyTokenMapping, cardonaTokenMapping, scrollSepTokenMapping, amoyFactory, cardonaFactory, scrollSepFactory, formatTimestamp } from '../options/buy/interactions';

export interface PositionData {
  contractAddr: string;
  tokenName: string;
  strikePrice: number;
  type: 'CALL' | 'PUT';
  quantity: number;
  expiration: string;
  premiumPaid: number;
  positionType: 'Bought' | 'Written';
  bought: boolean;
}

export const getPositions = async (address : any, walletProvider: any, chainId: any): Promise<{ active: PositionData[], closed: PositionData[] }> => {
  if (!walletProvider) throw new Error('No wallet provider found');

  let factoryAddress : string;
  let addressTokenMapping : { [key : string] : string };

  if(chainId == 80002) {
    factoryAddress = amoyFactory;
    addressTokenMapping = amoyTokenMapping;
  } else if(chainId == 2442) {
    factoryAddress = cardonaFactory;
    addressTokenMapping = cardonaTokenMapping;
  } else {
    factoryAddress = scrollSepFactory;
    addressTokenMapping = scrollSepTokenMapping;
  }
  
  const ethersProvider = new BrowserProvider(walletProvider);
  const signer = await ethersProvider.getSigner();
  
  const factoryContract = new Contract(factoryAddress, optionFactoryABI, signer)
  const callOptions = await factoryContract.getCallOptions()
  const putOptions = await factoryContract.getPutOptions()

  let activePositions: PositionData[] = [];
  let closedPositions: PositionData[] = [];

  for(const i in callOptions) {
    const _callContract = new Contract(callOptions[i], callOptionABI, signer)
    const _creator = await _callContract.creator()
    const _inited = await _callContract.inited()
    const _buyer = await _callContract.buyer()
    if(_inited && (_buyer == address || _creator == address)) {
        const _asset = await _callContract.asset()
        let _strikePrice = await _callContract.strikePrice()
        _strikePrice = formatUnits(_strikePrice, 8)
        let _premium = await _callContract.premium()
        _premium = formatUnits(_premium, 18)
        let _expiration = await _callContract.expiration()
        _expiration = formatTimestamp(_expiration)
        let _quantity = await _callContract.quantity()
        _quantity = formatUnits(_quantity, 18)
        let _executed = await _callContract.executed()
        if(_executed == false) {
            if(_buyer == address) {
                activePositions.push({contractAddr: callOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'CALL', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Bought', bought: true })
            } else {
                activePositions.push({contractAddr: callOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'CALL', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Written', bought: _buyer != "0x0000000000000000000000000000000000000000" })
            }
        } else {
            if(_buyer == address) {
                closedPositions.push({contractAddr: callOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'CALL', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Bought', bought: true })
            } else {
                closedPositions.push({contractAddr: callOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'CALL', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Written', bought: _buyer != "0x0000000000000000000000000000000000000000" })
            }
        }
      }
    }

    for(const i in putOptions) {
        const _callContract = new Contract(putOptions[i], putOptionABI, signer)
        const _creator = await _callContract.creator()
        const _inited = await _callContract.inited()
        const _buyer = await _callContract.buyer()
        if(_inited && (_buyer == address || _creator == address)) {
            const _asset = await _callContract.asset()
            let _strikePrice = await _callContract.strikePrice()
            _strikePrice = formatUnits(_strikePrice, 8)
            let _premium = await _callContract.premium()
            _premium = formatUnits(_premium, 18)
            let _expiration = await _callContract.expiration()
            _expiration = formatTimestamp(_expiration)
            let _quantity = await _callContract.quantity()
            _quantity = formatUnits(_quantity, 18)
            let _executed = await _callContract.executed()
            if(_executed == false) {
                if(_buyer == address) {
                    activePositions.push({contractAddr: putOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'PUT', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Bought', bought: true })
                } else {
                    activePositions.push({contractAddr: putOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'PUT', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Written', bought: _buyer != "0x0000000000000000000000000000000000000000" })
                }
            } else {
                if(_buyer == address) {
                    closedPositions.push({contractAddr: putOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'PUT', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Bought', bought: true })
                } else {
                    closedPositions.push({contractAddr: putOptions[i], tokenName: addressTokenMapping[_asset], strikePrice: _strikePrice, type: 'PUT', quantity: _quantity, expiration: _expiration, premiumPaid: _premium, positionType: 'Written', bought: _buyer != "0x0000000000000000000000000000000000000000" })
                }
            }
        }
    }

  return {
    active: activePositions,
    closed: closedPositions
  };
};

export const executeOption = async (walletProvider: any, chainId: any, optionAddr: string, call: boolean): Promise<void> => {
  if (!walletProvider) throw new Error('No wallet provider found');

  const ethersProvider = new BrowserProvider(walletProvider);
  const signer = await ethersProvider.getSigner();
  
  const optionContract = new Contract(optionAddr, call ? callOptionABI : putOptionABI, signer);
  const usdtContract = new Contract(usdtMapping[chainId], erc20ABI, signer);
  
  // Execute the option
  const tx = await optionContract.execute();
  await tx.wait();
  alert("Option executed successfully!");
};

export const withdrawOption = async (walletProvider: any, chainId: any, optionAddr: string, call: boolean): Promise<void> => {
  if (!walletProvider) throw new Error('No wallet provider found');

  const ethersProvider = new BrowserProvider(walletProvider);
  const signer = await ethersProvider.getSigner();
  
  const optionContract = new Contract(optionAddr, call ? callOptionABI : putOptionABI, signer);
  const usdtContract = new Contract(usdtMapping[chainId], erc20ABI, signer);
  
  // Withdraw the option
  const tx = await optionContract.withdraw();
  await tx.wait();
  alert("Option withdrawn successfully!");
};