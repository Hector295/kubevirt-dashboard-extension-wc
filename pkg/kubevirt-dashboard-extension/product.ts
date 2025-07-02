import { IPlugin } from '@shell/core/types';
import {
  KUBEVIRT_RESOURCE_NAME,
  PRODUCT_NAME,
  VM_RESOURCE_NAME,
  VMI_RESOURCE_NAME,
} from './constants';

export function init(plugin: IPlugin, store: any) {
  const { basicType, product, configureType, weightType } = plugin.DSL(store, PRODUCT_NAME);

  product({
    inStore: 'cluster',
    showNamespaceFilter: true,
    ifHaveType: KUBEVIRT_RESOURCE_NAME,
    to: {
      name: `c-cluster-product-resource`,
      params: {
        product: PRODUCT_NAME,
        resource: VM_RESOURCE_NAME,
      },
    },
  });

  configureType(VM_RESOURCE_NAME, {
    displayName: 'Virtual Machines',
    isCreatable: true,
    isEditable: true,
    isRemovable: true,
    showAge: true,
    showState: true,
    canYaml: true,
  });

  configureType(VMI_RESOURCE_NAME, {
    displayName: 'Virtual Machine Instances',
    isCreatable: false,
    isEditable: false,
    isRemovable: true,
    showAge: true,
    showState: true,
    canYaml: true,
  });

  weightType(VM_RESOURCE_NAME, 2, true);
  weightType(VMI_RESOURCE_NAME, 1, true);

  basicType([VM_RESOURCE_NAME, VMI_RESOURCE_NAME]);
}
