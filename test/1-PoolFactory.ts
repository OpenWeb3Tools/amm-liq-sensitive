import { expect } from "chai";
import {
  burnLiq,
  usdcAddr,
  getTokenBal,
  oneHundred,
  oneMillion,
  oneThousand,
  zeroAddr,
} from "./utils/utils";
import BigNumber from "bignumber.js";
import { calcLiquidityUnits } from "./utils/maths";
import { ZeroAddress } from "ethers";
import { createPoolsFixture, deployFixture } from "./0-Fixtures";
import {
  nativePoolInput1,
  nativePoolInput2,
  nativePoolToken1,
  nativePoolToken2,
  stablePoolInput1,
  stablePoolInput2,
  stablePoolToken1,
  stablePoolToken2,
  startBalanceBtc,
  startBalanceStables,
  wrapAddr,
} from "./utils/variables";

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("🏭 Pool Factory Contract", function () {
  describe("createPool() checks", function () {
    it("Pool deploy should fail if either input is zero", async function () {
      const { poolFactory, addr1 } = await loadFixture(deployFixture);
      await expect(
        poolFactory
          .connect(addr1)
          .createPool("0", oneHundred, usdcAddr, zeroAddr)
      ).to.be.revertedWith("Input1!>100000");
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(oneHundred, "0", usdcAddr, zeroAddr)
      ).to.be.revertedWith("Input2!>100000");
    });

    it("Pool deploy should fail if either inputs are !> 100k wei", async function () {
      const { poolFactory, addr1 } = await loadFixture(deployFixture);
      await expect(
        poolFactory
          .connect(addr1)
          .createPool("100000", oneHundred, usdcAddr, zeroAddr)
      ).to.be.revertedWith("Input1!>100000");
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(oneHundred, "100000", usdcAddr, zeroAddr)
      ).to.be.revertedWith("Input2!>100000");
    });

    it("Pool deploy should fail if token1 & token2 are the same", async function () {
      const { poolFactory, addr1 } = await loadFixture(deployFixture);
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(oneThousand, oneHundred, usdcAddr, usdcAddr)
      ).to.be.revertedWith("!Valid");
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(oneThousand, oneHundred, zeroAddr, zeroAddr)
      ).to.be.revertedWith("!Valid");
    });

    it("Pool deploy should fail if native<>wrapped pool is attempted", async function () {
      const { poolFactory, addr1 } = await loadFixture(deployFixture);
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(oneThousand, oneHundred, wrapAddr, zeroAddr)
      ).to.be.revertedWith("!Valid");
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(oneThousand, oneHundred, zeroAddr, wrapAddr)
      ).to.be.revertedWith("!Valid");
    });

    it("Pool deploy should fail if duplicate configuration of paired tokens ", async function () {
      const { poolFactory, addr1 } = await loadFixture(createPoolsFixture);
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(
            stablePoolInput1,
            stablePoolInput2,
            stablePoolToken1,
            stablePoolToken2
          )
      ).to.be.revertedWith("Exists");
      await expect(
        poolFactory
          .connect(addr1)
          .createPool(
            stablePoolInput2,
            stablePoolInput1,
            stablePoolToken2,
            stablePoolToken1
          )
      ).to.be.revertedWith("Exists");
    });
  });

  describe("createPool() balances", function () {
    it("Pool and user balances must change by correct amounts", async function () {
      const {
        addr1,
        usdcAsAddr1,
        usdtAsAddr1,
        btcbAsAddr1,
        stablePoolAddr,
        nativePoolAddr,
      } = await loadFixture(createPoolsFixture);
      // Get user balances after txn
      const addr1usdcBal = await getTokenBal(usdcAsAddr1, addr1);
      const addr1UsdtBal = await getTokenBal(usdtAsAddr1, addr1);
      // TODO: Add 'get' BNB addr1 balance
      const addr1BtcbBal = await getTokenBal(btcbAsAddr1, addr1);

      // Get pool balances after txn
      const poolusdcBal = await getTokenBal(usdcAsAddr1, stablePoolAddr);
      const poolUsdtBal = await getTokenBal(usdtAsAddr1, stablePoolAddr);
      // TODO: Add 'get' BNB Pool balance
      const poolBtcbBal = await getTokenBal(btcbAsAddr1, nativePoolAddr);

      // Expected user & pool balances after txn
      const addr1usdcExp =
        BigNumber(startBalanceStables).minus(stablePoolInput1);
      const addr1UsdtExp =
        BigNumber(startBalanceStables).minus(stablePoolInput2);
      // TODO: Add BNB balance change expectations
      const addr1BtcbExp = BigNumber(startBalanceBtc).minus(nativePoolInput2);
      // console.log("DEBUG:", addr1usdcBal, addr1usdcExp.toFixed(0));

      // Run addr1 balance checks
      expect(addr1usdcBal).to.equal(addr1usdcExp.toFixed(0));
      expect(addr1UsdtBal).to.equal(addr1UsdtExp.toFixed(0));
      // TODO: Add BNB addr1 balance change expectations
      expect(addr1BtcbBal).to.equal(addr1BtcbExp.toFixed(0));

      // Run pool balance checks
      expect(poolusdcBal).to.equal(stablePoolInput1);
      expect(poolUsdtBal).to.equal(stablePoolInput2);
      // TODO: Add BNB pool balance change expectations
      expect(poolBtcbBal).to.equal(nativePoolInput2);
    });

    it("User & burn address should receive the correct share of initial LP units", async function () {
      const { addr1, poolFactory, stablePoolAsAddr1, nativePoolAsAddr1 } =
        await loadFixture(createPoolsFixture);
      const burnAddr = poolFactory.target;

      // Get user balances after txn
      const addr1StableLpBal = await getTokenBal(stablePoolAsAddr1, addr1);
      const addr1NativeLpBal = await getTokenBal(nativePoolAsAddr1, addr1);

      // Get burnAddr balances after txn
      const burnedStableLpBal = await getTokenBal(stablePoolAsAddr1, burnAddr);
      const burnedNativeLpBal = await getTokenBal(nativePoolAsAddr1, burnAddr);

      // Total LP units minted
      const totalStableLps = calcLiquidityUnits(
        stablePoolInput1,
        "0",
        stablePoolInput2,
        "0",
        "0"
      );
      const totalNativeLps = calcLiquidityUnits(
        nativePoolInput1,
        "0",
        nativePoolInput2,
        "0",
        "0"
      );

      // Expected locked/burned balances after txn are === burnLiq
      const burnedStableLpExp = burnLiq;
      const burnedNativeLpExp = burnLiq;

      // Expected user balances after txn
      const addr1StableLpExp =
        BigNumber(totalStableLps).minus(burnedStableLpExp);
      const addr1NativeLpExp =
        BigNumber(totalNativeLps).minus(burnedNativeLpExp);

      // Run burned balance checks
      expect(burnedStableLpBal).to.equal(burnedStableLpExp);
      expect(burnedNativeLpBal).to.equal(burnedNativeLpExp);

      // Run addr1 balance checks
      expect(addr1StableLpBal).to.equal(addr1StableLpExp.toFixed(0));
      expect(addr1NativeLpBal).to.equal(addr1NativeLpExp.toFixed(0));
    });
  });

  describe("createPool() events", function () {
    it("Should emit PoolCreated event", async function () {
      const { poolFactory, addr1, usdcAsAddr1, usdtAsAddr1, btcbAsAddr1 } =
        await loadFixture(deployFixture);

      await usdcAsAddr1.approve(poolFactory.target, oneMillion);
      await usdtAsAddr1.approve(poolFactory.target, oneMillion);
      await btcbAsAddr1.approve(poolFactory.target, oneMillion);

      let _token1Addr = stablePoolToken1;
      let _token2Addr = stablePoolToken2;
      if (stablePoolToken1 == ZeroAddress) {
        _token1Addr = wrapAddr; // Translate token1 native->wrapped address
      }
      if (stablePoolToken2 == ZeroAddress) {
        _token2Addr = wrapAddr; // Translate token2 native->wrapped address
      }

      if (_token1Addr > _token2Addr) {
        const _addr1 = _token1Addr; // Cache address
        _token1Addr = _token2Addr; // Swap token1<>token2 addresses ...
        _token2Addr = _addr1; // ... into hexadecimal value order
      }

      let tx1 = await poolFactory
        .connect(addr1)
        .createPool(
          stablePoolInput1,
          stablePoolInput2,
          stablePoolToken1,
          stablePoolToken2
        );
      tx1 = await tx1.wait();
      tx1 = tx1.logs.filter(
        (x: any) => x.fragment && x.fragment.name === "PoolCreated"
      )[0];
      // console.log(tx1);

      const stablePoolAddr = await poolFactory.getPool(
        stablePoolToken1,
        stablePoolToken2
      );

      expect(tx1.args[0]).to.equal(_token1Addr);
      expect(tx1.args[1]).to.equal(_token2Addr);
      expect(tx1.args[2]).to.equal(stablePoolAddr);

      let _token3Addr = nativePoolToken1;
      let _token4Addr = nativePoolToken2;
      if (nativePoolToken1 == ZeroAddress) {
        _token3Addr = wrapAddr; // Translate token1 native->wrapped address
      }
      if (nativePoolToken2 == ZeroAddress) {
        _token4Addr = wrapAddr; // Translate token2 native->wrapped address
      }

      if (_token3Addr > _token4Addr) {
        const _addr3 = _token3Addr; // Cache address
        _token3Addr = _token4Addr; // Swap token1<>token2 addresses ...
        _token4Addr = _addr3; // ... into hexadecimal value order
      }

      let tx2 = await poolFactory
        .connect(addr1)
        .createPool(
          nativePoolInput1,
          nativePoolInput2,
          nativePoolToken1,
          nativePoolToken2,
          { value: nativePoolInput1 }
        );
      tx2 = await tx2.wait();
      tx2 = tx2.logs.filter(
        (x: any) => x.fragment && x.fragment.name === "PoolCreated"
      )[0];
      // console.log(tx2);

      const nativePoolAddr = await poolFactory.getPool(
        wrapAddr,
        nativePoolToken2
      );

      expect(tx2.args[0]).to.equal(_token3Addr);
      expect(tx2.args[1]).to.equal(_token4Addr);
      expect(tx2.args[2]).to.equal(nativePoolAddr);
    });
  });
});
