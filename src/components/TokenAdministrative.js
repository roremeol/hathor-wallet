/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import HathorAlert from '../components/HathorAlert';
import TokenMint from '../components/tokens/TokenMint';
import TokenMelt from '../components/tokens/TokenMelt';
import TokenDelegate from '../components/tokens/TokenDelegate';
import TokenDestroy from '../components/tokens/TokenDestroy';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';
import PropTypes from 'prop-types';
import helpers from '../utils/helpers';
import { get } from 'lodash';

const mapStateToProps = (state, props) => {
  const HTR_UID = hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
  let htrBalance = 0;
  if (HTR_UID in state.tokensBalance) {
    htrBalance = state.tokensBalance[HTR_UID].available;
  }

  let history = [];
  if (props.selectedToken) {
    history = state.tokensHistory[props.selectedToken];
  }
  return {
    htrBalance,
    tokensHistory: state.tokensHistory,
    tokensBalance: state.tokensBalance,
    wallet: state.wallet,
    tokenMetadata: state.tokenMetadata,
  };
};

/**
 * Component to manage a token. Mint, melt, delegate, destroy.
 *
 * @memberof Components
 */
class TokenAdministrative extends React.Component {
  /**
   * mintCount {number} Quantity of mint authorities available
   * meltCount {number} Quantity of melt authorities available
   * action {string} selected action (mint, melt, delegate-mint, delegate-melt, destroy-mint, destroy-melt)
   * successMessage {string} success message to show
   * errorMessage {String} Message to show in case of error getting token info
   * totalSupply {number} Token total supply
   * balance {number} Amount available of selected token
   */
  state = {
    mintCount: 0,
    meltCount: 0,
    action: '',
    successMessage: '',
    errorMessage: '',
    totalSupply: null,
    balance: 0,
  };

  componentDidMount() {
    this.updateData();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.tokensHistory !== this.props.tokensHistory) {
      this.updateData();
    }
  }

  updateData = () => {
    this.updateTokenInfo();
    this.updateWalletInfo();
  }

  /**
   * Upadte token info getting data from the full node (can mint, can melt, total supply)
   */
  updateTokenInfo = () => {
    this.setState({ errorMessage: '' });
    hathorLib.walletApi.getGeneralTokenInfo(this.props.token.uid, (response) => {
      if (response.success) {
        this.setState({
          totalSupply: response.total,
        });
      } else {
        this.setState({ errorMessage: response.message });
      }
    });
  }

  /**
   * Update token state after didmount or props update
   */
  updateWalletInfo = () => {
    const mintUtxos = this.props.wallet.getMintAuthority(this.props.token.uid, { many: true });
    const mintCount = mintUtxos ? mintUtxos.length : 0;

    const meltUtxos = this.props.wallet.getMeltAuthority(this.props.token.uid, { many: true });
    const meltCount = meltUtxos ? meltUtxos.length : 0;

    const tokenBalance = this.props.token.uid in this.props.tokensBalance ? this.props.tokensBalance[this.props.token.uid].available : 0;

    this.setState({ mintCount, meltCount, balance: tokenBalance });
  }

  /**
   * Show alert success message
   *
   * @param {string} message Success message
   */
  showSuccess = (message) => {
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    })
  }

  /**
   * Called when user clicks an action link
   *
   * @param {Object} e Event emitted by the link clicked
   * @param {string} action String representing the action clicked
   */
  actionClicked = (e, action) => {
    e.preventDefault();
    this.cleanStates();
    this.setState({ action });
  }

  /**
   * Goes to initial state, without any action selected
   */
  cancelAction = () => {
    this.cleanStates();
  }

  /**
   * Clean all states to its initial values
   */
  cleanStates = () => {
    this.setState({ action: '' });
  }

  render() {
    if (hathorLib.wallet.isHardwareWallet()) {
      return (
        <div className="content-wrapper flex align-items-start">
          <p>{t`This feature is not currently supported for a hardware wallet.`}</p>
        </div>
      )
    }

    if (this.state.errorMessage) {
      return (
        <div className="content-wrapper flex align-items-start">
          <p className="text-danger">{this.state.errorMessage}</p>
        </div>
      )
    }

    const renderBottom = () => {
      switch (this.state.action) {
        case 'mint':
          return <TokenMint htrBalance={this.props.htrBalance} action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} />
        case 'melt':
          return <TokenMelt action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} walletAmount={this.state.balance} />
        case 'delegate-mint':
          return <TokenDelegate action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} />
        case 'delegate-melt':
          return <TokenDelegate action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} />
        case 'destroy-mint':
          return <TokenDestroy action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} authoritiesLength={this.state.mintCount} showSuccess={this.showSuccess} />
        case 'destroy-melt':
          return <TokenDestroy action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} authoritiesLength={this.state.meltCount} showSuccess={this.showSuccess} />
        default:
          return null;
      }
    }

    const renderMeltLinks = () => {
      return (
        <div className="d-flex flex-column align-items-center">
          <p><strong>{t`Operations`}</strong></p>
          <a className={`${this.state.action === 'melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'melt')} href="true">{t`Melt tokens`} <i className="fa fa-minus ml-1" title={t`Melt tokens`}></i></a>
          <a className={`mt-1 mb-1 ${this.state.action === 'delegate-melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'delegate-melt')} href="true">{t`Delegate melt`} <i className="fa fa-long-arrow-up ml-1" title={t`Delegate melt`}></i></a>
          <a className={`${this.state.action === 'destroy-melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'destroy-melt')} href="true">{t`Destroy melt`} <i className="fa fa-trash ml-1" title={t`Destroy melt`}></i></a>
        </div>
      );
    }

    const renderMintLinks = () => {
      return (
        <div className="d-flex flex-column align-items-center">
          <p><strong>{t`Operations`}</strong></p>
          <a className={`${this.state.action === 'mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'mint')} href="true">{t`Mint tokens`} <i className="fa fa-plus ml-1" title={t`Mint more tokens`}></i></a>
          <a className={`mt-1 mb-1 ${this.state.action === 'delegate-mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'delegate-mint')} href="true">{t`Delegate mint`} <i className="fa fa-long-arrow-up ml-1" title={t`Delegate mint`}></i></a>
          <a className={`${this.state.action === 'destroy-mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'destroy-mint')} href="true">{t`Destroy mint`} <i className="fa fa-trash ml-1" title={t`Destroy mint`}></i></a>
        </div>
      );
    }

    const renderMintMeltWrapper = () => {
      if (this.state.mintCount === 0 && this.state.meltCount === 0) {
        return <p>{t`You have no more authority outputs for this token`}</p>;
      }

      return (
        <div className="d-flex align-items-center mt-3">
          <div className="token-manage-wrapper d-flex flex-column align-items-center mr-4">
            <p><strong>{t`Mint authority management`}</strong></p>
            <p>You are the owner of {this.state.mintCount} mint {hathorLib.helpers.plural(this.state.mintCount, 'output', 'outputs')}</p>
            {this.state.mintCount > 0 && renderMintLinks()}
          </div>
          <div className="token-manage-wrapper d-flex flex-column align-items-center">
            <p><strong>{t`Melt authority management`}</strong></p>
            <p>You are the owner of {this.state.meltCount} melt {hathorLib.helpers.plural(this.state.meltCount, 'output', 'outputs')}</p>
            {this.state.meltCount > 0 && renderMeltLinks()}
          </div>
        </div>
      );
    }

    const isNFT = helpers.isTokenNFT(get(this.props, 'token.uid'), this.props.tokenMetadata);

    return (
      <div className="flex align-items-center">
        <p className="mt-2 mb-2"><strong>{t`Total supply:`} </strong>{this.state.totalSupply ? helpers.renderValue(this.state.totalSupply, isNFT) : '-'} {this.props.token.symbol}</p>
        <p className="mt-2 mb-2"><strong>{t`Your balance available:`} </strong>{helpers.renderValue(this.state.balance, isNFT)} {this.props.token.symbol}</p>
        <div className="token-detail-wallet-info">
          {renderMintMeltWrapper()}
        </div>
        <div className='token-detail-bottom'>
          {renderBottom()}
        </div>
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
      </div>
    )
  }
}


/*
 * token: Token to show administrative tools {name, symbol, uid}
 */
TokenAdministrative.propTypes = {
  token: PropTypes.exact({
    name: PropTypes.string,
    symbol: PropTypes.string,
    uid: PropTypes.string,
  }),
};

export default connect(mapStateToProps, null, null, {forwardRef: true})(TokenAdministrative);
