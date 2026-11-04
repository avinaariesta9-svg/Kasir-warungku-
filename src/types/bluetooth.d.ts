// Type declarations for Web Bluetooth API
declare interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

declare interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

declare interface BluetoothRemoteGATTService {
  device: BluetoothDevice;
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

declare interface BluetoothRemoteGATTCharacteristic {
  service: BluetoothRemoteGATTService;
  uuid: string;
  properties: {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
  };
  value?: DataView;
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
}

declare interface Navigator {
  bluetooth?: {
    requestDevice(options?: {
      filters?: Array<{ name?: string; namePrefix?: string; services?: Array<string | number> }>;
      optionalServices?: Array<string | number>;
      acceptAllDevices?: boolean;
    }): Promise<BluetoothDevice>;
  };
}
