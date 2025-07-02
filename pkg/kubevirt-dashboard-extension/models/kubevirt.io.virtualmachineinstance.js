import SteveModel from '@shell/plugins/steve/steve-class';

export default class VirtualMachineInstance extends SteveModel {
  get availableActions() {
    return [
      {
        action: 'softrebootVMI',
        enabled: !!this.canSoftReboot,
        icon: 'icon icon-pipeline',
        label: this.t('kubevirt.action.softreboot'),
      },
      {
        action: 'pauseVMI',
        enabled: !!this.canPause,
        icon: 'icon icon-pause',
        label: this.t('kubevirt.action.pause'),
      },
      {
        action: 'unpauseVMI',
        enabled: !!this.canUnpause,
        icon: 'icon icon-spinner',
        label: this.t('kubevirt.action.unpause'),
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
    ];
  }

  async doVMISubresourceActionGrowl(actionName, opt = {}) {
    const clusterId = this.$rootGetters['clusterId'];
    const url = `/k8s/clusters/${clusterId}/apis/subresources.kubevirt.io/v1/namespaces/${this.metadata.namespace}/virtualmachineinstances/${this.metadata.name}/${actionName}`;
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

  softrebootVMI() {
    this.doVMISubresourceActionGrowl('softreboot');
  }

  pauseVMI() {
    this.doVMISubresourceActionGrowl('pause');
  }

  unpauseVMI() {
    this.doVMISubresourceActionGrowl('unpause');
  }

  get canSoftReboot() {
    return this.isRunning;
  }

  get canPause() {
    return !this.isPaused && this.isRunning;
  }

  get canUnpause() {
    return this.isPaused;
  }

  get isRunning() {
    return this.status?.phase === 'Running';
  }

  get isPaused() {
    return this.status?.phase === 'Paused';
  }

  get vmState() {
    return this.status?.phase || 'Unknown';
  }

  get nodeName() {
    return this.status?.nodeName || '';
  }

  get ipAddresses() {
    return this.status?.interfaces?.map((iface) => iface.ipAddress).filter((ip) => ip) || [];
  }

  get stateDisplay() {
    return this.vmState;
  }

  get stateColor() {
    switch (this.vmState) {
      case 'Running':
        return 'text-success';
      case 'Pending':
      case 'Scheduling':
        return 'text-warning';
      case 'Succeeded':
        return 'text-muted';
      case 'Failed':
        return 'text-error';
      default:
        return 'text-muted';
    }
  }

  get getVMIApiPath() {
    const clusterId = this.$rootGetters['clusterId'];

    if (this.$rootGetters['isMultiCluster']) {
      const prefix = `/k8s/clusters/${clusterId}`;

      return `${prefix}/apis/subresources.kubevirt.io/v1/namespaces/${this.metadata.namespace}/virtualmachineinstances/${this.name}/vnc`;
    } else {
      return `/apis/subresources.kubevirt.io/v1/namespaces/${this.metadata.namespace}/virtualmachineinstances/${this.name}/vnc`;
    }
  }

  get getSerialConsolePath() {
    const clusterId = this.$rootGetters['clusterId'];

    if (this.$rootGetters['isMultiCluster']) {
      const prefix = `/k8s/clusters/${clusterId}`;

      return `${prefix}/apis/subresources.kubevirt.io/v1/namespaces/${this.metadata.namespace}/virtualmachineinstances/${this.name}/console`;
    } else {
      return `/apis/subresources.kubevirt.io/v1/namespaces/${this.metadata.namespace}/virtualmachineinstances/${this.name}/console`;
    }
  }
}
