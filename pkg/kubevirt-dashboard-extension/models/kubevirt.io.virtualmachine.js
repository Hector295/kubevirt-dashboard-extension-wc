import SteveModel from '@shell/plugins/steve/steve-class';
import { VMI_RESOURCE_NAME } from '../constants';
import { calculateVCPU } from './utils';
import { parseSi } from '@shell/utils/units';

export default class VirtualMachine extends SteveModel {
  get availableActions() {
    return [
      {
        action: 'stopVM',
        enabled: !!this.canStop,
        icon: 'icon icon-close',
        label: this.t('kubevirt.action.stop'),
        bulkable: true,
      },
      {
        action: 'startVM',
        enabled: !!this.canStart,
        icon: 'icon icon-play',
        label: this.t('kubevirt.action.start'),
        bulkable: true,
      },
      {
        action: 'softrebootVM',
        enabled: !!this.canSoftReboot,
        icon: 'icon icon-pipeline',
        label: this.t('kubevirt.action.softreboot'),
        bulkable: true,
      },
      {
        action: 'pauseVM',
        enabled: !!this.canPause,
        icon: 'icon icon-pause',
        label: this.t('kubevirt.action.pause'),
        bulkable: true,
      },
      {
        action: 'unpauseVM',
        enabled: !!this.canUnpause,
        icon: 'icon icon-spinner',
        label: this.t('kubevirt.action.unpause'),
        bulkable: true,
      },
      {
        action: 'goToEdit',
        label: this.t('action.edit'),
        icon: 'icon icon-edit',
        enabled: this.canUpdate,
      },
      {
        action: 'promptRemove',
        altAction: 'remove',
        label: this.t('action.remove'),
        icon: 'icon icon-trash',
        bulkable: true,
        enabled: this.canDelete,
        bulkAction: 'promptRemove',
        weight: -10,
      },
      {
        action: 'viewInApi',
        label: this.t('action.viewInApi'),
        icon: 'icon icon-external-link',
        enabled: true,
      },
      {
        action: 'goToViewYaml',
        label: this.t('action.viewEditYaml'),
        icon: 'icon icon-file',
        enabled: this.canViewInApi,
      },
      {
        action: 'download',
        label: this.t('action.download'),
        icon: 'icon icon-download',
        bulkable: true,
        enabled: this.canViewInApi,
      },
    ];
  }

  async doVMSubresourceActionGrowl(subresource, actionName, opt = {}) {
    const clusterId = this.$rootGetters['clusterId'];
    const url = `/k8s/clusters/${clusterId}/apis/subresources.kubevirt.io/v1/namespaces/${this.metadata.namespace}/${subresource}/${this.metadata.name}/${actionName}`;
    try {
      return await this.$dispatch(`request`, {
        headers: { accept: '*/*' },
        method: 'PUT',
        url,
        ...opt,
      });
    } catch (err) {
      this.$dispatch(
        'growl/fromError',
        {
          title: this.$rootGetters['i18n/t']('generic.notification.title.error'),
          err: err.data || err,
        },
        { root: true }
      );
    }
  }

  startVM() {
    this.doVMSubresourceActionGrowl('virtualmachines', 'start');
  }

  stopVM() {
    this.doVMSubresourceActionGrowl('virtualmachines', 'stop');
  }

  softrebootVM() {
    this.doVMSubresourceActionGrowl('virtualmachineinstances', 'softreboot');
  }

  pauseVM() {
    this.doVMSubresourceActionGrowl('virtualmachineinstances', 'pause');
  }

  unpauseVM() {
    this.doVMSubresourceActionGrowl('virtualmachineinstances', 'unpause');
  }

  get canStart() {
    return !this.isStarting && !this.isRunning;
  }

  get canStop() {
    return !this.isBeingStopped && this.isRunning;
  }

  get canSoftReboot() {
    return this.canPause;
  }

  get canPause() {
    return !this.isPaused && this.isRunning;
  }

  get canUnpause() {
    return !this.isRunning && this.isPaused;
  }

  get isRunning() {
    return this.status?.printableStatus === 'Running' || this.spec?.running === true;
  }

  get isStarting() {
    return this.status?.printableStatus === 'Starting';
  }

  get isBeingStopped() {
    return this.status?.printableStatus === 'Stopping';
  }

  get isPaused() {
    return this.status?.printableStatus === 'Paused';
  }

  get vmState() {
    return this.status?.printableStatus || 'Unknown';
  }

  get vCPUs() {
    const vmi = this.$getters['byId'](VMI_RESOURCE_NAME, this.id);
    return (
      calculateVCPU(vmi?.spec?.domain?.cpu) ||
      calculateVCPU(this.spec.template?.spec?.domain?.cpu) ||
      this.spec.template?.spec?.domain?.resources?.requests?.cpu ||
      this.spec.template?.spec?.domain?.resources?.limits?.cpu ||
      1
    );
  }

  get displayMemory() {
    return (
      this.spec.template.spec.domain.resources?.limits?.memory ||
      this.spec.template.spec.domain.resources?.requests?.memory
    );
  }

  get memorySort() {
    const memory = this?.spec?.template?.spec?.domain?.resources?.requests?.memory || 0;

    const formatSize = parseSi(memory);

    return parseInt(formatSize);
  }

  get nodeName() {
    const vmi = this.$getters['byId'](VMI_RESOURCE_NAME, this.id);
    return vmi?.status?.nodeName || '';
  }

  get ipAddresses() {
    const vmi = this.$getters['byId'](VMI_RESOURCE_NAME, this.id);
    return vmi?.status?.interfaces?.map((iface) => iface.ipAddress).filter((ip) => ip) || [];
  }

  get stateDisplay() {
    return this.vmState;
  }

  get stateColor() {
    switch (this.vmState) {
      case 'Running':
        return 'text-success';
      case 'Starting':
      case 'Terminating':
        return 'text-warning';
      case 'Stopped':
        return 'text-muted';
      case 'Error':
      case 'Failed':
        return 'text-error';
      default:
        return 'text-muted';
    }
  }
}
