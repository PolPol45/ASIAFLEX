import { ContractFactory, ContractTransactionResponse } from "ethers";
import type { Signer, BigNumberish, AddressLike, ContractDeployTransaction, ContractRunner } from "ethers";
import type { NonPayableOverrides } from "../../../common";
import type { TreasuryController, TreasuryControllerInterface } from "../../../artifacts/contracts/TreasuryController";
type TreasuryControllerConstructorParams = [signer?: Signer] | ConstructorParameters<typeof ContractFactory>;
export declare class TreasuryController__factory extends ContractFactory {
  constructor(...args: TreasuryControllerConstructorParams);
  getDeployTransaction(
    _asiaFlexToken: AddressLike,
    _treasurySigner: AddressLike,
    _requestExpiration: BigNumberish,
    overrides?: NonPayableOverrides & {
      from?: string;
    }
  ): Promise<ContractDeployTransaction>;
  deploy(
    _asiaFlexToken: AddressLike,
    _treasurySigner: AddressLike,
    _requestExpiration: BigNumberish,
    overrides?: NonPayableOverrides & {
      from?: string;
    }
  ): Promise<
    TreasuryController & {
      deploymentTransaction(): ContractTransactionResponse;
    }
  >;
  connect(runner: ContractRunner | null): TreasuryController__factory;
  static readonly bytecode =
    "0x61018060405234801561001157600080fd5b50604051611e03380380611e03833981016040819052610030916102c9565b60408051808201825260128152712a3932b0b9bab93ca1b7b73a3937b63632b960711b602080830191909152825180840190935260018352603160f81b908301529061007d826002610189565b6101205261008c816003610189565b61014052815160208084019190912060e052815190820120610100524660a05261011960e05161010051604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201529081019290925260608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b60805250503060c05261012d6000336101bc565b506101587fede9dcdb0ce99dc7cec9c7be9246ad08b37853683ad91569c187b647ddf5e21c336101bc565b506001600160a01b0392831661016052600480546001600160a01b03191692909316919091179091556005556104d4565b60006020835110156101a55761019e83610266565b90506101b6565b816101b084826103a4565b5060ff90505b92915050565b6000828152602081815260408083206001600160a01b038516845290915281205460ff1661025e576000838152602081815260408083206001600160a01b03861684529091529020805460ff191660011790556102163390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a45060016101b6565b5060006101b6565b600080829050601f8151111561029a578260405163305a27a960e01b81526004016102919190610462565b60405180910390fd5b80516102a5826104b0565b179392505050565b80516001600160a01b03811681146102c457600080fd5b919050565b6000806000606084860312156102de57600080fd5b6102e7846102ad565b92506102f5602085016102ad565b9150604084015190509250925092565b634e487b7160e01b600052604160045260246000fd5b600181811c9082168061032f57607f821691505b60208210810361034f57634e487b7160e01b600052602260045260246000fd5b50919050565b601f82111561039f57806000526020600020601f840160051c8101602085101561037c5750805b601f840160051c820191505b8181101561039c5760008155600101610388565b50505b505050565b81516001600160401b038111156103bd576103bd610305565b6103d1816103cb845461031b565b84610355565b6020601f82116001811461040557600083156103ed5750848201515b600019600385901b1c1916600184901b17845561039c565b600084815260208120601f198516915b828110156104355787850151825560209485019460019092019101610415565b50848210156104535786840151600019600387901b60f8161c191681555b50505050600190811b01905550565b602081526000825180602084015260005b818110156104905760208186018101516040868401015201610473565b506000604082850101526040601f19601f83011684010191505092915050565b8051602080830151919081101561034f5760001960209190910360031b1b16919050565b60805160a05160c05160e051610100516101205161014051610160516118ae6105556000396000818161041b0152818161058a0152818161078c015281816108620152610bf20152600061102501526000610ff3015260006111620152600061113a01526000611095015260006110bf015260006110e901526118ae6000f3fe608060405234801561001057600080fd5b50600436106101da5760003560e01c806384b0196e11610104578063a5580d8d116100a2578063d9b35e1211610071578063d9b35e12146103e6578063ebdf690f146103ee578063f9c3624614610403578063fd4b1a171461041657600080fd5b8063a5580d8d146102bf578063a71fdc301461039b578063c3bb2ebd146103ae578063d547741f146103d357600080fd5b80639440232c116100de5780639440232c1461034a57806394577c401461035d5780639f1a1c0314610370578063a217fddf1461039357600080fd5b806384b0196e1461031357806387cacdd81461032e57806391d148541461033757600080fd5b806351d4febc1161017c5780636dbef79c1161014b5780636dbef79c146102d25780636e8c16ba146102e5578063737c9670146102f85780638456cb591461030b57600080fd5b806351d4febc1461028e578063594b70ab146102a15780635c975abb146102b4578063610c68fa146102bf57600080fd5b80632f2ff15d116101b85780632f2ff15d1461024d57806336568abe146102605780633dc1c253146102735780633f4ba83a1461028657600080fd5b806301ffc9a7146101df57806309028fc314610207578063248a9ca31461021c575b600080fd5b6101f26101ed36600461149a565b61043d565b60405190151581526020015b60405180910390f35b61021a610215366004611525565b610474565b005b61023f61022a366004611579565b60009081526020819052604090206001015490565b6040519081526020016101fe565b61021a61025b3660046115ae565b61067e565b61021a61026e3660046115ae565b6106a9565b61021a610281366004611579565b6106e1565b61021a61073f565b61021a61029c3660046115da565b610762565b61021a6102af3660046115da565b610838565b60015460ff166101f2565b6101f26102cd366004611525565b61090e565b6101f26102e0366004611525565b610957565b61023f6102f336600461160d565b6109d2565b61023f61030636600461160d565b6109f0565b61021a6109fc565b61031b610a1c565b6040516101fe979695949392919061166f565b61023f60055481565b6101f26103453660046115ae565b610a62565b61021a610358366004611707565b610a8b565b6101f261036b366004611525565b610af6565b6101f261037e366004611579565b60066020526000908152604090205460ff1681565b61023f600081565b61021a6103a9366004611525565b610b02565b6004546001600160a01b03165b6040516001600160a01b0390911681526020016101fe565b61021a6103e13660046115ae565b610cd8565b60055461023f565b61023f60008051602061185983398151915281565b6004546103bb906001600160a01b031681565b6103bb7f000000000000000000000000000000000000000000000000000000000000000081565b60006001600160e01b03198216637965db0b60e01b148061046e57506301ffc9a760e01b6001600160e01b03198316145b92915050565b61047c610cfd565b60055461048d906040850135611722565b4211156104c357600554604080516335ee921b60e11b815290850135600482015260248101919091526044015b60405180910390fd5b6104ce838383610af6565b6104fe5760006104dd84610d23565b9050828282604051637ab683f760e01b81526004016104ba9392919061176c565b6000838383604051602001610515939291906117c3565b60408051601f1981840301815291815281516020928301206000818152600690935291205490915060ff161561056457828282604051637ab683f760e01b81526004016104ba9392919061176c565b6000818152600660209081526040909120805460ff191660011790556001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690631e458bee906105bd90870187611707565b866020013587606001356040518463ffffffff1660e01b81526004016105e5939291906117ed565b600060405180830381600087803b1580156105ff57600080fd5b505af1158015610613573d6000803e3d6000fd5b50610625925050506020850185611707565b6001600160a01b03167f836ff5fb67ec4713e238ab7ba20ad732e30c646a841a1b8b1d58a9df10dd2fca85602001358660600135604051610670929190918252602082015260400190565b60405180910390a250505050565b60008281526020819052604090206001015461069981610dae565b6106a38383610db8565b50505050565b6001600160a01b03811633146106d25760405163334bd91960e11b815260040160405180910390fd5b6106dc8282610e4a565b505050565b6000805160206118598339815191526106f981610dae565b600580549083905560408051828152602081018590527fe50bef8d2e095f997566e365267c670c2cae23975b8b824bfe97fc9fbfa9b74a910160405180910390a1505050565b60008051602061185983398151915261075781610dae565b61075f610eb5565b50565b600061076d81610dae565b610775610f07565b60405163158a1cc360e01b81526001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000169063158a1cc3906107c5908790879087906004016117ed565b600060405180830381600087803b1580156107df57600080fd5b505af11580156107f3573d6000803e3d6000fd5b505060408051868152602081018690526001600160a01b03881693507f3f9bff40aa00e04febb1a95fc32dcb72ee8dab5851e95c5cda9c79b41c5049a2925001610670565b600061084381610dae565b61084b610f07565b604051630f22c5f760e11b81526001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690631e458bee9061089b908790879087906004016117ed565b600060405180830381600087803b1580156108b557600080fd5b505af11580156108c9573d6000803e3d6000fd5b505060408051868152602081018690526001600160a01b03881693507f836ff5fb67ec4713e238ab7ba20ad732e30c646a841a1b8b1d58a9df10dd2fca925001610670565b600080848484604051602001610926939291906117c3565b60408051808303601f1901815291815281516020928301206000908152600690925290205460ff1695945050505050565b60008061096385610f2a565b9050600061097082610f5a565b905060006109b686868080601f0160208091040260200160405190810160405280939291908181526020018383808284376000920191909152508693925050610f879050565b6004546001600160a01b03908116911614979650505050505050565b6000806109de83610d23565b90506109e981610f5a565b9392505050565b6000806109de83610f2a565b600080516020611859833981519152610a1481610dae565b61075f610fb1565b600060608060008060006060610a30610fec565b610a3861101e565b60408051600080825260208201909252600f60f81b9b939a50919850469750309650945092509050565b6000918252602082815260408084206001600160a01b0393909316845291905290205460ff1690565b600080516020611859833981519152610aa381610dae565b600480546001600160a01b038481166001600160a01b0319831681179093556040519116919082907f0e09e0b526e147e20fb5fb8f14468a698f27ce50bc914b9fcdf16aa51d06adf990600090a3505050565b60008061096385610d23565b610b0a610cfd565b600554610b1b906040850135611722565b421115610b4c57600554604080516335ee921b60e11b815290850135600482015260248101919091526044016104ba565b610b57838383610957565b610b665760006104dd84610f2a565b6000838383604051602001610b7d939291906117c3565b60408051601f1981840301815291815281516020928301206000818152600690935291205490915060ff1615610bcc57828282604051637ab683f760e01b81526004016104ba9392919061176c565b6000818152600660209081526040909120805460ff191660011790556001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000169063158a1cc390610c2590870187611707565b866020013587606001356040518463ffffffff1660e01b8152600401610c4d939291906117ed565b600060405180830381600087803b158015610c6757600080fd5b505af1158015610c7b573d6000803e3d6000fd5b50610c8d925050506020850185611707565b6001600160a01b03167f3f9bff40aa00e04febb1a95fc32dcb72ee8dab5851e95c5cda9c79b41c5049a285602001358660600135604051610670929190918252602082015260400190565b600082815260208190526040902060010154610cf381610dae565b6106a38383610e4a565b60015460ff1615610d215760405163d93c066560e01b815260040160405180910390fd5b565b60007f694527b7fb9eb5ece6e484322001809a920e26600b43cd2fc0b7d132fcf0cf94610d536020840184611707565b604080516020818101949094526001600160a01b0390921682820152918401356060828101919091529184013560808201529083013560a082015260c001604051602081830303815290604052805190602001209050919050565b61075f813361104b565b6000610dc48383610a62565b610e42576000838152602081815260408083206001600160a01b03861684529091529020805460ff19166001179055610dfa3390565b6001600160a01b0316826001600160a01b0316847f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d60405160405180910390a450600161046e565b50600061046e565b6000610e568383610a62565b15610e42576000838152602081815260408083206001600160a01b0386168085529252808320805460ff1916905551339286917ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9190a450600161046e565b610ebd610f07565b6001805460ff191690557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa335b6040516001600160a01b03909116815260200160405180910390a1565b60015460ff16610d2157604051638dfc202b60e01b815260040160405180910390fd5b60007fde7b4b9ae78fb8afa946ac57f7dbb2faab2e4d4f49de962cfa122cf689799709610d536020840184611707565b600061046e610f67611088565b8360405161190160f01b8152600281019290925260228201526042902090565b600080600080610f9786866111b3565b925092509250610fa78282611200565b5090949350505050565b610fb9610cfd565b6001805460ff1916811790557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a25833610eea565b60606110197f000000000000000000000000000000000000000000000000000000000000000060026112b9565b905090565b60606110197f000000000000000000000000000000000000000000000000000000000000000060036112b9565b6110558282610a62565b6110845760405163e2517d3f60e01b81526001600160a01b0382166004820152602481018390526044016104ba565b5050565b6000306001600160a01b037f0000000000000000000000000000000000000000000000000000000000000000161480156110e157507f000000000000000000000000000000000000000000000000000000000000000046145b1561110b57507f000000000000000000000000000000000000000000000000000000000000000090565b611019604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f0000000000000000000000000000000000000000000000000000000000000000918101919091527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a082015260009060c00160405160208183030381529060405280519060200120905090565b600080600083516041036111ed5760208401516040850151606086015160001a6111df88828585611364565b9550955095505050506111f9565b50508151600091506002905b9250925092565b60008260038111156112145761121461180e565b0361121d575050565b60018260038111156112315761123161180e565b0361124f5760405163f645eedf60e01b815260040160405180910390fd5b60028260038111156112635761126361180e565b036112845760405163fce698f760e01b8152600481018290526024016104ba565b60038260038111156112985761129861180e565b03611084576040516335e2f38360e21b8152600481018290526024016104ba565b606060ff83146112d3576112cc83611433565b905061046e565b8180546112df90611824565b80601f016020809104026020016040519081016040528092919081815260200182805461130b90611824565b80156113585780601f1061132d57610100808354040283529160200191611358565b820191906000526020600020905b81548152906001019060200180831161133b57829003601f168201915b5050505050905061046e565b600080807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a084111561139f5750600091506003905082611429565b604080516000808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa1580156113f3573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b03811661141f57506000925060019150829050611429565b9250600091508190505b9450945094915050565b6060600061144083611472565b604080516020808252818301909252919250600091906020820181803683375050509182525060208101929092525090565b600060ff8216601f81111561046e57604051632cd44ac360e21b815260040160405180910390fd5b6000602082840312156114ac57600080fd5b81356001600160e01b0319811681146109e957600080fd5b6000608082840312156114d657600080fd5b50919050565b60008083601f8401126114ee57600080fd5b50813567ffffffffffffffff81111561150657600080fd5b60208301915083602082850101111561151e57600080fd5b9250929050565b600080600060a0848603121561153a57600080fd5b61154485856114c4565b9250608084013567ffffffffffffffff81111561156057600080fd5b61156c868287016114dc565b9497909650939450505050565b60006020828403121561158b57600080fd5b5035919050565b80356001600160a01b03811681146115a957600080fd5b919050565b600080604083850312156115c157600080fd5b823591506115d160208401611592565b90509250929050565b6000806000606084860312156115ef57600080fd5b6115f884611592565b95602085013595506040909401359392505050565b60006080828403121561161f57600080fd5b6109e983836114c4565b6000815180845260005b8181101561164f57602081850181015186830182015201611633565b506000602082860101526020601f19601f83011685010191505092915050565b60ff60f81b8816815260e06020820152600061168e60e0830189611629565b82810360408401526116a08189611629565b606084018890526001600160a01b038716608085015260a0840186905283810360c08501528451808252602080870193509091019060005b818110156116f65783518352602093840193909201916001016116d8565b50909b9a5050505050505050505050565b60006020828403121561171957600080fd5b6109e982611592565b8082018082111561046e57634e487b7160e01b600052601160045260246000fd5b81835281816020850137506000828201602090810191909152601f909101601f19169091010190565b604081526000611780604083018587611743565b9050826020830152949350505050565b6001600160a01b036117a182611592565b1682526020818101359083015260408082013590830152606090810135910152565b6117cd8185611790565b60a0608082015260006117e460a083018486611743565b95945050505050565b6001600160a01b039390931683526020830191909152604082015260600190565b634e487b7160e01b600052602160045260246000fd5b600181811c9082168061183857607f821691505b6020821081036114d657634e487b7160e01b600052602260045260246000fdfeede9dcdb0ce99dc7cec9c7be9246ad08b37853683ad91569c187b647ddf5e21ca26469706673582212206aaab7a8b4f1d6c068e31fe02cc8b186e9b3d01c3433a2e458c98b614cc41ef064736f6c634300081a0033";
  static readonly abi: readonly [
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "_asiaFlexToken";
          readonly type: "address";
        },
        {
          readonly internalType: "address";
          readonly name: "_treasurySigner";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "_requestExpiration";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "nonpayable";
      readonly type: "constructor";
    },
    {
      readonly inputs: readonly [];
      readonly name: "AccessControlBadConfirmation";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "neededRole";
          readonly type: "bytes32";
        },
      ];
      readonly name: "AccessControlUnauthorizedAccount";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "ECDSAInvalidSignature";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "length";
          readonly type: "uint256";
        },
      ];
      readonly name: "ECDSAInvalidSignatureLength";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "s";
          readonly type: "bytes32";
        },
      ];
      readonly name: "ECDSAInvalidSignatureS";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "EnforcedPause";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "ExpectedPause";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "provided";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "expected";
          readonly type: "bytes32";
        },
      ];
      readonly name: "InvalidReserveAttestation";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [];
      readonly name: "InvalidShortString";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "hash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "InvalidSignature";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "timestamp";
          readonly type: "uint256";
        },
        {
          readonly internalType: "uint256";
          readonly name: "expiration";
          readonly type: "uint256";
        },
      ];
      readonly name: "RequestExpired";
      readonly type: "error";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "string";
          readonly name: "str";
          readonly type: "string";
        },
      ];
      readonly name: "StringTooLong";
      readonly type: "error";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [];
      readonly name: "EIP712DomainChanged";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "MintExecuted";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "Paused";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "RedeemExecuted";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "oldExpiration";
          readonly type: "uint256";
        },
        {
          readonly indexed: false;
          readonly internalType: "uint256";
          readonly name: "newExpiration";
          readonly type: "uint256";
        },
      ];
      readonly name: "RequestExpirationUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "previousAdminRole";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "newAdminRole";
          readonly type: "bytes32";
        },
      ];
      readonly name: "RoleAdminChanged";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "sender";
          readonly type: "address";
        },
      ];
      readonly name: "RoleGranted";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "sender";
          readonly type: "address";
        },
      ];
      readonly name: "RoleRevoked";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "oldSigner";
          readonly type: "address";
        },
        {
          readonly indexed: true;
          readonly internalType: "address";
          readonly name: "newSigner";
          readonly type: "address";
        },
      ];
      readonly name: "TreasurySignerUpdated";
      readonly type: "event";
    },
    {
      readonly anonymous: false;
      readonly inputs: readonly [
        {
          readonly indexed: false;
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "Unpaused";
      readonly type: "event";
    },
    {
      readonly inputs: readonly [];
      readonly name: "ASIA_FLEX_TOKEN";
      readonly outputs: readonly [
        {
          readonly internalType: "contract IAsiaFlexToken";
          readonly name: "";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "DEFAULT_ADMIN_ROLE";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "TREASURY_MANAGER_ROLE";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "eip712Domain";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes1";
          readonly name: "fields";
          readonly type: "bytes1";
        },
        {
          readonly internalType: "string";
          readonly name: "name";
          readonly type: "string";
        },
        {
          readonly internalType: "string";
          readonly name: "version";
          readonly type: "string";
        },
        {
          readonly internalType: "uint256";
          readonly name: "chainId";
          readonly type: "uint256";
        },
        {
          readonly internalType: "address";
          readonly name: "verifyingContract";
          readonly type: "address";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "salt";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "uint256[]";
          readonly name: "extensions";
          readonly type: "uint256[]";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "from";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "emergencyBurn";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "to";
          readonly type: "address";
        },
        {
          readonly internalType: "uint256";
          readonly name: "amount";
          readonly type: "uint256";
        },
        {
          readonly internalType: "bytes32";
          readonly name: "attestationHash";
          readonly type: "bytes32";
        },
      ];
      readonly name: "emergencyMint";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "to";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.MintRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "executeMint";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "from";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.RedeemRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "executeRedeem";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "to";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.MintRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
      ];
      readonly name: "getMintRequestHash";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "from";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.RedeemRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
      ];
      readonly name: "getRedeemRequestHash";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getRequestExpiration";
      readonly outputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
      ];
      readonly name: "getRoleAdmin";
      readonly outputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "getTreasurySigner";
      readonly outputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "grantRole";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "hasRole";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "from";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.RedeemRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "isRedeemRequestUsed";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "to";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.MintRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "isRequestUsed";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "pause";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "paused";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "callerConfirmation";
          readonly type: "address";
        },
      ];
      readonly name: "renounceRole";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "requestExpiration";
      readonly outputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "";
          readonly type: "uint256";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "role";
          readonly type: "bytes32";
        },
        {
          readonly internalType: "address";
          readonly name: "account";
          readonly type: "address";
        },
      ];
      readonly name: "revokeRole";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "uint256";
          readonly name: "newExpiration";
          readonly type: "uint256";
        },
      ];
      readonly name: "setRequestExpiration";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "newSigner";
          readonly type: "address";
        },
      ];
      readonly name: "setTreasurySigner";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes4";
          readonly name: "interfaceId";
          readonly type: "bytes4";
        },
      ];
      readonly name: "supportsInterface";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "treasurySigner";
      readonly outputs: readonly [
        {
          readonly internalType: "address";
          readonly name: "";
          readonly type: "address";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [];
      readonly name: "unpause";
      readonly outputs: readonly [];
      readonly stateMutability: "nonpayable";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly internalType: "bytes32";
          readonly name: "";
          readonly type: "bytes32";
        },
      ];
      readonly name: "usedRequests";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "to";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.MintRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "verifyMintSignature";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
    {
      readonly inputs: readonly [
        {
          readonly components: readonly [
            {
              readonly internalType: "address";
              readonly name: "from";
              readonly type: "address";
            },
            {
              readonly internalType: "uint256";
              readonly name: "amount";
              readonly type: "uint256";
            },
            {
              readonly internalType: "uint256";
              readonly name: "timestamp";
              readonly type: "uint256";
            },
            {
              readonly internalType: "bytes32";
              readonly name: "reserveHash";
              readonly type: "bytes32";
            },
          ];
          readonly internalType: "struct ITreasuryController.RedeemRequest";
          readonly name: "request";
          readonly type: "tuple";
        },
        {
          readonly internalType: "bytes";
          readonly name: "signature";
          readonly type: "bytes";
        },
      ];
      readonly name: "verifyRedeemSignature";
      readonly outputs: readonly [
        {
          readonly internalType: "bool";
          readonly name: "";
          readonly type: "bool";
        },
      ];
      readonly stateMutability: "view";
      readonly type: "function";
    },
  ];
  static createInterface(): TreasuryControllerInterface;
  static connect(address: string, runner?: ContractRunner | null): TreasuryController;
}
export {};
//# sourceMappingURL=TreasuryController__factory.d.ts.map
